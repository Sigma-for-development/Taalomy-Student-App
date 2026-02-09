import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { offlineService } from '../services/OfflineService';
import { Ionicons } from '@expo/vector-icons';

const OfflineBanner: React.FC = () => {
    const [isConnected, setIsConnected] = useState(true);
    const [slideAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        // Subscribe to connection changes
        const unsubscribe = offlineService.subscribe((connected) => {
            setIsConnected(connected);

            // Animate banner
            Animated.timing(slideAnim, {
                toValue: connected ? 0 : 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });

        return () => unsubscribe();
    }, []);

    if (isConnected && slideAnim === new Animated.Value(0)) {
        // Optional: return null if we want to completely unmount, but animating opacity/transform is smoother.
        // However, to avoid layout shifts if it's position absolute, it's fine.
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-100, 0], // Slide down from top
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={20} color="#fff" style={styles.icon} />
                <Text style={styles.text}>You are currently offline. Changes will queue.</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#c0392b', // Red-ish color
        zIndex: 9999, // Ensure it stays on top
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        height: 40, // Base height without safe area
    },
    icon: {
        marginEnd: 8,
    },
    text: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default OfflineBanner;
