import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    TextInput,
    Modal,
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import api from '../../src/config/api';
import { API_CONFIG } from '../../src/config/api';
import { formatDate } from '../../src/utils/date';

interface SupportMessage {
    id: number;
    sender: {
        id: number;
        email: string;
        is_staff: boolean;
    };
    message: string;
    created_at: string;
    is_staff: boolean;
}

interface SupportTicket {
    id: number;
    ticket_id: string;
    category: string;
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    messages: SupportMessage[];
    has_unread_admin_message: boolean;
}

const SupportScreen = () => {
    const { t } = useTranslation();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');

    // Form State
    const [category, setCategory] = useState('technical');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async (showSuccessToast = false) => {
        try {
            setLoading(true);
            const response = await api.get(API_CONFIG.ENDPOINTS.SUPPORT_TICKETS);
            setTickets(response.data);
            if (showSuccessToast) {
                Toast.show({
                    type: 'success',
                    text1: t('success'),
                    text2: t('tickets_refreshed') || 'Tickets refreshed',
                });
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_load_tickets') || 'Failed to load support tickets',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const createTicket = async () => {
        if (!subject.trim() || !message.trim()) {
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('fill_all_fields') || 'Please fill in all fields',
            });
            return;
        }

        try {
            setSubmitting(true);
            await api.post(API_CONFIG.ENDPOINTS.SUPPORT_TICKETS, {
                category,
                subject,
                message
            });

            setCreateModalVisible(false);
            setSubject('');
            setMessage('');
            setCategory('technical');
            loadTickets();
            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('ticket_created') || 'Support ticket created successfully',
            });
        } catch (error) {
            console.error('Error creating ticket:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_create_ticket') || 'Failed to create support ticket',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;

        try {
            setSubmitting(true);
            await api.post(
                `${API_CONFIG.ENDPOINTS.SUPPORT_TICKETS}${selectedTicket.id}/reply/`,
                { message: replyMessage }
            );

            setReplyMessage('');
            loadTickets(); // Refresh list to see new message

            // Optionally update the selected ticket in place if we had a proper structure,
            // but reloading list is safer to ensure sync.
            // For better UX, we could fetch just this ticket again.
            try {
                const updatedTicketRes = await api.get(`${API_CONFIG.ENDPOINTS.SUPPORT_TICKETS}${selectedTicket.id}/`);
                setSelectedTicket(updatedTicketRes.data);
            } catch (e) {
                // If single fetch fails, just close modal
                setDetailModalVisible(false);
            }
            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('reply_sent') || 'Reply sent successfully',
            });

        } catch (error) {
            console.error('Error sending reply:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_send_reply') || 'Failed to send reply',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to open detail
    const openTicketDetail = async (ticket: SupportTicket) => {
        // Fetch fresh details including messages
        try {
            // Optimistically set current ticket data
            setSelectedTicket(ticket);
            setDetailModalVisible(true);

            // Then fetch full data (messages might not be in list view depending on backend)
            // Assuming backend list view includes messages or we need detail view.
            // Checking ViewSet: usually retrieve() is separate. 
            // If list serializer didn't include messages, we need this call.
            const response = await api.get(`${API_CONFIG.ENDPOINTS.SUPPORT_TICKETS}${ticket.id}/`);
            setSelectedTicket(response.data);
        } catch (error) {
            console.error(error);
        }
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
            case 'pending': return '#f1c40f';
            case 'in_progress': return '#3498db';
            case 'resolved': return '#2ecc71';
            case 'closed': return '#e74c3c';
            default: return '#bdc3c7';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pending';
            case 'in_progress': return 'In Progress';
            case 'resolved': return 'Resolved';
            case 'closed': return 'Closed';
            default: return status;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Support Center</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets(true); }} tintColor="#3498db" />
                }
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 40 }} />
                ) : tickets.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="help-buoy-outline" size={64} color="#3498db" style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyTitle}>No support tickets yet</Text>
                        <Text style={styles.emptySubtitle}>Need help? Create a new ticket below.</Text>
                    </View>
                ) : (
                    tickets.map((ticket) => (
                        <TouchableOpacity
                            key={ticket.id}
                            onPress={() => openTicketDetail(ticket)}
                            style={[
                                styles.ticketCard,
                                { borderLeftColor: getStatusColor(ticket.status) }
                            ]}>
                            <View style={styles.ticketHeader}>
                                <View style={styles.ticketIdRow}>
                                    <Text style={styles.ticketId}>{ticket.ticket_id}</Text>
                                    {ticket.has_unread_admin_message && (
                                        <View style={styles.unreadDot} />
                                    )}
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ticket.status)}20` }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                                        {getStatusLabel(ticket.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                            <Text style={styles.ticketCategory}>{ticket.category.toUpperCase()}</Text>
                            <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                style={styles.fab}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Create Ticket Modal */}
            <Modal
                visible={createModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Support Ticket</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#bdc3c7" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.categoryContainer}>
                                {['technical', 'account', 'payment', 'other'].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setCategory(cat)}
                                        style={[
                                            styles.categoryChip,
                                            { backgroundColor: category === cat ? '#3498db' : 'rgba(255,255,255,0.1)' }
                                        ]}
                                    >
                                        <Text style={styles.categoryText}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Subject</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Brief summary of your issue"
                                placeholderTextColor="#7f8c8d"
                                value={subject}
                                onChangeText={setSubject}
                            />

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your issue in detail..."
                                placeholderTextColor="#7f8c8d"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                            />

                            <TouchableOpacity
                                onPress={createTicket}
                                disabled={submitting || !subject.trim() || !message.trim()}
                                style={[
                                    styles.submitButton,
                                    { opacity: (submitting || !subject.trim() || !message.trim()) ? 0.6 : 1 }
                                ]}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Ticket</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Detail/Chat Modal */}
            <Modal
                visible={detailModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.detailModalContainer}>
                    <View style={styles.detailHeader}>
                        <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.detailHeaderTitle}>
                            {selectedTicket?.ticket_id}
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={styles.detailContent}>
                        {selectedTicket && (
                            <>
                                <Text style={styles.detailSubject}>
                                    {selectedTicket.subject}
                                </Text>
                                <View style={styles.detailMetaRow}>
                                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedTicket.status)}20`, marginEnd: 10 }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(selectedTicket.status) }]}>
                                            {getStatusLabel(selectedTicket.status)}
                                        </Text>
                                    </View>
                                    <Text style={styles.detailDate}>
                                        {formatDate(selectedTicket.created_at, {
                                            year: 'numeric',
                                            month: 'numeric',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: 'numeric',
                                            hour12: true
                                        })}
                                    </Text>
                                </View>

                                <Text style={styles.historyTitle}>Messages History</Text>

                                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                    selectedTicket.messages.map((msg) => (
                                        <View key={msg.id} style={[
                                            styles.messageContainer,
                                            { alignSelf: msg.is_staff ? 'flex-start' : 'flex-end' }
                                        ]}>
                                            <View style={[
                                                styles.messageBubble,
                                                {
                                                    backgroundColor: msg.is_staff ? '#2c3e50' : '#2980b9',
                                                    borderBottomStartRadius: msg.is_staff ? 0 : 16,
                                                    borderBottomEndRadius: msg.is_staff ? 16 : 0
                                                }
                                            ]}>
                                                <Text style={styles.messageText}>{msg.message}</Text>
                                            </View>
                                            <Text style={[
                                                styles.messageMeta,
                                                { textAlign: msg.is_staff ? 'left' : 'right' }
                                            ]}>
                                                {msg.is_staff ? 'Support Staff' : 'You'} • {formatDate(msg.created_at, {
                                                    year: 'numeric',
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: 'numeric',
                                                    hour12: true
                                                })}
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noMessagesText}>No additional messages.</Text>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Reply Input */}
                    <View style={styles.replyFooter}>
                        <View style={styles.replyRow}>
                            <TextInput
                                style={styles.replyInput}
                                placeholder="Type a reply..."
                                placeholderTextColor="#7f8c8d"
                                value={replyMessage}
                                onChangeText={setReplyMessage}
                                multiline
                            />
                            <TouchableOpacity
                                onPress={handleReply}
                                disabled={submitting || !replyMessage.trim()}
                                style={[
                                    styles.sendButton,
                                    { opacity: (!replyMessage.trim() || submitting) ? 0.5 : 1 }
                                ]}
                            >
                                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollContent: {
        padding: 24,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        color: '#bdc3c7',
        marginTop: 16,
        fontSize: 16,
    },
    emptySubtitle: {
        color: '#7f8c8d',
        marginTop: 8,
    },
    ticketCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    ticketIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ticketId: {
        color: '#bdc3c7',
        fontSize: 12,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e74c3c',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    ticketSubject: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    ticketCategory: {
        color: '#bdc3c7',
        fontSize: 14,
    },
    ticketDate: {
        color: '#7f8c8d',
        fontSize: 12,
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        padding: 24,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    inputLabel: {
        color: '#bdc3c7',
        marginBottom: 8,
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    categoryText: {
        color: '#fff',
        textTransform: 'capitalize',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        marginBottom: 20,
    },
    textArea: {
        height: 150,
        textAlignVertical: 'top',
        marginBottom: 30,
    },
    submitButton: {
        backgroundColor: '#3498db',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailModalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    detailHeader: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#1a1a1a',
    },
    detailHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    detailContent: {
        flex: 1,
        padding: 20,
    },
    detailSubject: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    detailMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    detailDate: {
        color: '#bdc3c7',
        fontSize: 12,
    },
    historyTitle: {
        color: '#bdc3c7',
        marginBottom: 20,
    },
    messageContainer: {
        marginBottom: 16,
        maxWidth: '85%',
    },
    messageBubble: {
        borderRadius: 16,
        padding: 12,
    },
    messageText: {
        color: '#fff',
    },
    messageMeta: {
        color: '#7f8c8d',
        fontSize: 10,
        marginTop: 4,
    },
    noMessagesText: {
        color: '#7f8c8d',
        fontStyle: 'italic',
    },
    replyFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#1a1a1a',
    },
    replyRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    replyInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        marginEnd: 12,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SupportScreen;
