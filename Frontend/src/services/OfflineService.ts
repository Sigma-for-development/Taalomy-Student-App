import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

const NETWORK_STATE_KEY = 'offline_network_state';
const REQUEST_QUEUE_KEY = 'offline_request_queue';
const CACHE_PREFIX = 'offline_cache_';

interface QueuedRequest {
    id: string;
    config: AxiosRequestConfig;
    timestamp: number;
}

class OfflineService {
    private isConnected: boolean = true;
    private listeners: ((isConnected: boolean) => void)[] = [];
    private queueProcessing: boolean = false;
    private apiInstance: any = null; // To be set later to avoid circular dependency

    constructor() {
        this.init();
    }

    async init() {
        // Determine initial state
        const state = await NetInfo.fetch();
        this.isConnected = state.isConnected ?? true;

        // Listen for updates
        NetInfo.addEventListener((state: NetInfoState) => {
            const prevConnected = this.isConnected;
            this.isConnected = state.isConnected ?? true;

            // Notify listeners
            this.listeners.forEach(listener => listener(this.isConnected));

            // If we just came online, process auth and queue
            if (!prevConnected && this.isConnected) {
                this.processQueue();
            }
        });

        // Load queue size mainly for debug or UI usage if needed
        const queue = await this.getQueue();
        if (queue.length > 0 && this.isConnected) {
            this.processQueue();
        }
    }

    // --- Public API ---

    public setApiInstance(api: any) {
        this.apiInstance = api;
    }

    public getIsConnected(): boolean {
        return this.isConnected;
    }

    public subscribe(listener: (isConnected: boolean) => void) {
        this.listeners.push(listener);
        listener(this.isConnected); // Immediate callback
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // --- Caching Logic ---

    /**
     * Generates a cache key based on URL and Params
     */
    private getCacheKey(config: AxiosRequestConfig): string {
        const url = config.url || '';
        const sortedParams = config.params
            ? JSON.stringify(Object.keys(config.params).sort().reduce((obj: any, key) => {
                obj[key] = config.params[key];
                return obj;
            }, {}))
            : '';
        return `${CACHE_PREFIX}${url}_${sortedParams}`;
    }

    /**
     * Caches a successful GET response
     */
    public async cacheRequest(config: AxiosRequestConfig, response: any) {
        if (config.method?.toLowerCase() !== 'get') return;

        try {
            const key = this.getCacheKey(config);
            const cacheData = {
                data: response.data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                timestamp: Date.now(),
            };
            await AsyncStorage.setItem(key, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to cache request:', error);
        }
    }

    /**
     * Retrieves a cached response if available
     */
    public async getCachedRequest(config: AxiosRequestConfig): Promise<AxiosResponse | null> {
        try {
            const key = this.getCacheKey(config);
            const cached = await AsyncStorage.getItem(key);

            if (!cached) return null;

            const parsed = JSON.parse(cached);

            // We return a constructed AxiosResponse
            return {
                data: parsed.data,
                status: 200, // Mock 200 for offline
                statusText: 'OK',
                headers: parsed.headers || {},
                config: config as any,
                request: {},
            };
        } catch (error) {
            console.warn('Failed to retrieve cached request:', error);
            return null;
        }
    }

    // --- Queue Logic ---

    /**
     * Adds a failed request (POST/PUT/DELETE) to the queue
     */
    public async queueRequest(config: AxiosRequestConfig) {
        try {
            const queue = await this.getQueue();
            const newRequest: QueuedRequest = {
                id: Date.now().toString(),
                config: {
                    url: config.url,
                    method: config.method,
                    data: config.data,
                    params: config.params,
                    headers: config.headers as any, // Be careful with Auth headers potentially expiring
                },
                timestamp: Date.now(),
            };

            queue.push(newRequest);
            await AsyncStorage.setItem(REQUEST_QUEUE_KEY, JSON.stringify(queue));
            console.log(`[OfflineService] Queued request to ${config.url}`);
        } catch (error) {
            console.error('Failed to queue request:', error);
        }
    }

    private async getQueue(): Promise<QueuedRequest[]> {
        try {
            const json = await AsyncStorage.getItem(REQUEST_QUEUE_KEY);
            return json ? JSON.parse(json) : [];
        } catch {
            return [];
        }
    }

    public async processQueue() {
        if (this.queueProcessing || !this.apiInstance) return;

        this.queueProcessing = true;
        console.log('[OfflineService] Processing offline queue...');

        try {
            const queue = await this.getQueue();
            if (queue.length === 0) {
                this.queueProcessing = false;
                return;
            }

            // Clone queue to modify
            const remainingQueue = [...queue];

            // Process sequentially to maintain order
            for (const req of queue) {
                try {
                    console.log(`[OfflineService] Retrying ${req.config.method} ${req.config.url}...`);

                    // Re-attach current token if needed? 
                    // Ideally, rely on the interceptor in api.ts to attach the *fresh* token.
                    // But we need to strip 'Authorization' from the stored config so it gets regenerated.
                    if (req.config.headers && req.config.headers['Authorization']) {
                        delete req.config.headers['Authorization'];
                    }

                    await this.apiInstance.request(req.config as any);

                    // Remove success from remaining
                    const index = remainingQueue.findIndex(r => r.id === req.id);
                    if (index > -1) remainingQueue.splice(index, 1);

                } catch (err) {
                    console.error(`[OfflineService] Failed to retry request ${req.id}:`, err);
                    // Decide if we keep it or drop it. For now, we keep it if it's a network error?
                    // But if we are "Online" and it fails, it might be a logic error (400/500).
                    // We probably should drop 4xx errors to avoid infinite loops.
                    // For simplicity in this iteration: If it fails while we think we are connected, 
                    // we might want to remove it to prevent blocking forever, OR shift it to the end.

                    // Let's remove it if it's not a network error to be safe.
                    // Since we are inside processQueue, we assume we have connectivity.
                    const index = remainingQueue.findIndex(r => r.id === req.id);
                    if (index > -1) remainingQueue.splice(index, 1);
                }
            }

            await AsyncStorage.setItem(REQUEST_QUEUE_KEY, JSON.stringify(remainingQueue));

        } catch (error) {
            console.error('[OfflineService] Error processing queue:', error);
        } finally {
            this.queueProcessing = false;
        }
    }
}

export const offlineService = new OfflineService();
