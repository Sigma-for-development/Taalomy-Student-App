import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
    Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { tokenStorage } from '../src/utils/storage';
const AsyncStorage = tokenStorage;
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';
import ProfilePicture from '../src/components/ProfilePicture';
import { formatDate } from '../src/utils/date';

interface Invitation {
    id: number;
    lecturer: number;
    lecturer_name: string;
    lecturer_profile_picture?: string;
    invitation_type: 'intake' | 'class' | 'group';
    target_name: string;
    payment_plan: string;
    amount: number;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    created_at: string;
    expires_at: string;
    is_expired: boolean;
}

const InvitationsScreen = () => {
    const { t } = useTranslation();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('pending');

    // Payment State
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [currentBookingId, setCurrentBookingId] = useState<number | null>(null);

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useEffect(() => {
        loadInvitations();
    }, []);

    useEffect(() => {
        if (filterStatus === 'all') {
            setFilteredInvitations(invitations);
        } else {
            setFilteredInvitations(invitations.filter(inv => inv.status === filterStatus));
        }
    }, [filterStatus, invitations]);

    const loadInvitations = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${baseurl}student/invitations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setInvitations(response.data);
            // Default to showing pending invitations
            setFilteredInvitations(response.data.filter((inv: Invitation) =>
                filterStatus === 'all' ? true : inv.status === filterStatus
            ));
        } catch (error) {
            console.error('Error loading invitations:', error);
            Alert.alert(t('error'), t('error_loading_invitations'));
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInvitations();
        setRefreshing(false);
    };

    const handleAcceptInvitation = async (invitation: Invitation) => {
        Alert.alert(
            t('accept_invitation'),
            t('accept_invitation_confirmation', { amount: (Number(invitation.amount) || 0).toFixed(2) }),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('accept_and_pay'),
                    onPress: async () => {
                        try {
                            setProcessingId(invitation.id);
                            const token = await AsyncStorage.getItem('access_token');

                            const response = await axios.post(
                                `${baseurl}student/invitations/${invitation.id}/accept/`,
                                { platform: 'ios' },
                                { headers: { 'Authorization': `Bearer ${token}` } }
                            );

                            if (response.data.payment_required) {
                                // Open WebView for payment
                                setCurrentBookingId(response.data.booking_id);
                                setPaymentUrl(response.data.iframe_url);
                            } else {
                                // Free or already paid
                                Toast.show({
                                    type: 'success',
                                    text1: t('success'),
                                    text2: t('invitation_accepted'),
                                });
                                await loadInvitations();
                            }
                        } catch (error: any) {
                            console.error('Error accepting invitation:', error);
                            const errorMsg = error.response?.data?.error ||
                                (Array.isArray(error.response?.data) ? error.response?.data[0] : null) ||
                                t('error_accepting_invitation');
                            Alert.alert(t('error'), String(errorMsg));
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleWebViewNavigationStateChange = (navState: any) => {
        const { url } = navState;
        if (url.includes('success=true')) {
            setPaymentUrl(null);
            if (currentBookingId) {
                completePaymentManually(currentBookingId, true);
            }
            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('payment_successful'),
            });
            loadInvitations();
        } else if (url.includes('success=false')) {
            setPaymentUrl(null);
            if (currentBookingId) {
                completePaymentManually(currentBookingId, false);
            }
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('payment_failed_msg') || 'Payment failed',
            });
        }
    };

    const completePaymentManually = async (bookingId: number, success: boolean) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            await axios.post(
                `${baseurl}booking/complete-payment/`,
                { booking_id: bookingId, success: success },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            loadInvitations();
        } catch (error) {
            console.error('Manual completion error:', error);
        }
    };

    const handleDeclineInvitation = async (invitationId: number) => {
        Alert.alert(
            t('decline_invitation'),
            t('decline_invitation_confirmation'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('decline'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessingId(invitationId);
                            const token = await AsyncStorage.getItem('access_token');
                            await axios.post(
                                `${baseurl}student/invitations/${invitationId}/decline/`,
                                {},
                                { headers: { 'Authorization': `Bearer ${token}` } }
                            );
                            await loadInvitations();
                            Alert.alert(t('success'), t('invitation_declined'));
                        } catch (error) {
                            console.error('Error declining invitation:', error);
                            Alert.alert(t('error'), t('error_declining_invitation'));
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'intake': return 'school-outline';
            case 'class': return 'book-outline';
            case 'group': return 'people-outline';
            default: return 'folder-outline';
        }
    };

    // Use shared formatDate from utils
    // const formatDate = (dateString: string) => { ... }

    const getDaysUntilExpiry = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading')}</Text>
            </View>
        );
    }

    const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
    const statusFilters = [
        { key: 'pending', label: t('pending'), count: pendingCount },
        { key: 'all', label: t('all'), count: invitations.length }
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={{
                paddingTop: 60,
                paddingBottom: 20,
                paddingHorizontal: 20,
                backgroundColor: '#1a1a1a',
                borderBottomWidth: 1,
                borderBottomColor: '#2c2c2c',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#252525',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginEnd: 15,
                            borderWidth: 1,
                            borderColor: '#333'
                        }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                            {t('invitations')}
                        </Text>
                        {pendingCount > 0 && (
                            <Text style={{ fontSize: 14, color: '#f39c12', marginTop: 2 }}>
                                {t('pending_invitations_count', { count: pendingCount })}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Filter Buttons */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {statusFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            onPress={() => setFilterStatus(filter.key)}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 12,
                                backgroundColor: filterStatus === filter.key ? '#3498db' : '#252525',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: filterStatus === filter.key ? '#3498db' : '#333'
                            }}
                        >
                            <Text style={{
                                color: filterStatus === filter.key ? '#fff' : '#7f8c8d',
                                fontWeight: filterStatus === filter.key ? '700' : '500',
                                fontSize: 14
                            }}>
                                {filter.label} ({filter.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
                }
            >
                <View style={{ padding: 20 }}>
                    {filteredInvitations.map((invitation) => {
                        const daysLeft = getDaysUntilExpiry(invitation.expires_at);
                        const isPending = invitation.status === 'pending' && !invitation.is_expired;

                        return (
                            <View
                                key={invitation.id}
                                style={{
                                    backgroundColor: '#252525',
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 16,
                                    borderWidth: isPending ? 2 : 1,
                                    borderColor: isPending ? '#3498db' : '#333'
                                }}
                            >
                                {/* Lecturer Info */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <ProfilePicture
                                        imageUrl={invitation.lecturer_profile_picture}
                                        firstName={invitation.lecturer_name.split(' ')[0]}
                                        lastName={invitation.lecturer_name.split(' ')[1] || ''}
                                        size={56}
                                    />
                                    <View style={{ flex: 1, marginStart: 12 }}>
                                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                            {invitation.lecturer_name}
                                        </Text>
                                        <Text style={{ color: '#7f8c8d', fontSize: 13, marginTop: 2 }}>
                                            {t('invited_you_to_join')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Invitation Details */}
                                <View style={{
                                    backgroundColor: '#1a1a1a',
                                    borderRadius: 12,
                                    padding: 14,
                                    marginBottom: 12
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <View style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: 'rgba(52, 152, 219, 0.15)',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginEnd: 10
                                        }}>
                                            <Ionicons name={getTypeIcon(invitation.invitation_type) as any} size={20} color="#3498db" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#7f8c8d', fontSize: 12 }}>
                                                {t(invitation.invitation_type)}
                                            </Text>
                                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                                                {invitation.target_name}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{
                                        height: 1,
                                        backgroundColor: '#252525',
                                        marginVertical: 10
                                    }} />

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#7f8c8d', fontSize: 13 }}>
                                            {t(invitation.payment_plan)}
                                        </Text>
                                        <Text style={{ color: '#3498db', fontSize: 22, fontWeight: '700' }}>
                                            {(Number(invitation.amount) || 0).toFixed(2)} {t('currency')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Message */}
                                {invitation.message && (
                                    <View style={{
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: 10,
                                        padding: 14,
                                        marginBottom: 12,
                                        borderLeftWidth: 3,
                                        borderLeftColor: '#3498db'
                                    }}>
                                        <Text style={{ color: '#7f8c8d', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {t('message_from_lecturer')}
                                        </Text>
                                        <Text style={{ color: '#bdc3c7', fontSize: 14, lineHeight: 20 }}>
                                            "{invitation.message}"
                                        </Text>
                                    </View>
                                )}

                                {/* Expiry Warning */}
                                {isPending && daysLeft >= 0 && (
                                    <View style={{
                                        backgroundColor: daysLeft === 0 ? 'rgba(231, 76, 60, 0.15)' : 'rgba(241, 196, 15, 0.15)',
                                        borderRadius: 8,
                                        padding: 10,
                                        marginBottom: 12,
                                        flexDirection: 'row',
                                        alignItems: 'center'
                                    }}>
                                        <Ionicons
                                            name={daysLeft === 0 ? "alert-circle" : "time-outline"}
                                            size={18}
                                            color={daysLeft === 0 ? "#e74c3c" : "#f1c40f"}
                                        />
                                        <Text style={{
                                            color: daysLeft === 0 ? '#e74c3c' : '#f1c40f',
                                            fontSize: 13,
                                            fontWeight: '600',
                                            marginStart: 8,
                                            flex: 1
                                        }}>
                                            {daysLeft === 0 ? t('expires_today') : t('expires_in_n_days', { days: daysLeft })}
                                        </Text>
                                    </View>
                                )}

                                {/* Status Badge (if not pending) */}
                                {!isPending && (
                                    <View style={{
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: 8,
                                        padding: 10,
                                        marginBottom: 12,
                                        alignItems: 'center'
                                    }}>
                                        <Text style={{ color: '#7f8c8d', fontSize: 13 }}>
                                            {t('status')}: <Text style={{ fontWeight: '700' }}>{t(invitation.status)}</Text>
                                        </Text>
                                    </View>
                                )}

                                {/* Action Buttons */}
                                {isPending && (
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => handleDeclineInvitation(invitation.id)}
                                            disabled={processingId === invitation.id}
                                            style={{
                                                flex: 1,
                                                backgroundColor: 'rgba(231, 76, 60, 0.15)',
                                                paddingVertical: 14,
                                                borderRadius: 10,
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: 'rgba(231, 76, 60, 0.3)'
                                            }}
                                        >
                                            {processingId === invitation.id ? (
                                                <ActivityIndicator color="#e74c3c" size="small" />
                                            ) : (
                                                <Text style={{ color: '#e74c3c', fontSize: 15, fontWeight: '700' }}>
                                                    {t('decline')}
                                                </Text>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleAcceptInvitation(invitation)}
                                            disabled={processingId === invitation.id}
                                            style={{
                                                flex: 2,
                                                backgroundColor: '#27ae60',
                                                paddingVertical: 14,
                                                borderRadius: 10,
                                                alignItems: 'center',
                                                flexDirection: 'row',
                                                justifyContent: 'center',
                                                gap: 8
                                            }}
                                        >
                                            {processingId === invitation.id ? (
                                                <ActivityIndicator color="#fff" size="small" />
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                                        {t('accept_and_pay')}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Date */}
                                <Text style={{ color: '#7f8c8d', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
                                    {t('received_on')}: {formatDate(invitation.created_at)}
                                </Text>
                            </View>
                        );
                    })}

                    {filteredInvitations.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 80, opacity: 0.5 }}>
                            <Ionicons name="mail-open-outline" size={72} color="#7f8c8d" />
                            <Text style={{ color: '#7f8c8d', marginTop: 20, fontSize: 16, textAlign: 'center' }}>
                                {filterStatus === 'pending' ? t('no_pending_invitations') : t('no_invitations')}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={!!paymentUrl}
                animationType="slide"
                onRequestClose={() => setPaymentUrl(null)}
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 50,
                        paddingHorizontal: 20,
                        paddingBottom: 15,
                        backgroundColor: '#1a1a1a'
                    }}>
                        <TouchableOpacity onPress={() => setPaymentUrl(null)}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{t('payment')}</Text>
                        <View style={{ width: 28 }} />
                    </View>
                    {paymentUrl && (
                        <WebView
                            source={{ uri: paymentUrl }}
                            style={{ flex: 1 }}
                            onNavigationStateChange={handleWebViewNavigationStateChange}
                            startInLoadingState={true}
                            renderLoading={() => <ActivityIndicator size="large" color="#3498db" style={{ position: 'absolute', top: '50%', left: '50%' }} />}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};

export default InvitationsScreen;
