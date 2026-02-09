
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const TermsOfService = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isRTL = I18nManager.isRTL;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('terms_of_service_title')}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Text style={[styles.introText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('terms_of_service_intro')}
                    </Text>

                    {/* Section 1 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_1_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_1_content')}
                        </Text>
                    </View>

                    {/* Section 2 - Liability (Highlighted) */}
                    <View style={[styles.section, styles.highlightedSection]}>
                        <View style={[styles.warningHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="warning-outline" size={24} color="#e74c3c" />
                            <Text style={[styles.sectionTitle, { color: '#e74c3c', marginStart: isRTL ? 0 : 10, marginEnd: isRTL ? 10 : 0 }]}>
                                {t('tos_section_2_title')}
                            </Text>
                        </View>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left', fontWeight: '500' }]}>
                            {t('tos_section_2_content')}
                        </Text>
                    </View>

                    {/* Section 3 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_3_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_3_content')}
                        </Text>
                    </View>

                    {/* Section 4 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_4_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_4_content')}
                        </Text>
                    </View>

                    {/* Section 5 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_5_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_5_content')}
                        </Text>
                    </View>

                    {/* Section 6 - Termination */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_6_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_6_content')}
                        </Text>
                    </View>

                    {/* Section 7 - Governing Law */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_7_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_7_content')}
                        </Text>
                    </View>

                    {/* Section 8 - User Generated Content */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_8_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_8_content')}
                        </Text>
                    </View>

                    {/* Section 9 - Payments */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_9_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_9_content')}
                        </Text>
                    </View>

                    {/* Section 10 - Age Limit */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_10_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_10_content')}
                        </Text>
                    </View>

                    {/* Section 11 - Contact Us */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_11_title')}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('tos_section_11_content')}
                        </Text>
                    </View>
                    <View style={styles.footer}>
                        <Ionicons name="shield-checkmark-outline" size={40} color="#27ae60" style={{ marginBottom: 10 }} />
                        <Text style={styles.footerText}>{t('i_agree')}</Text>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    backgroundGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    introText: {
        fontSize: 16,
        color: '#ecf0f1',
        lineHeight: 24,
        marginBottom: 25,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    sectionContent: {
        fontSize: 15,
        color: '#bdc3c7',
        lineHeight: 24,
    },
    highlightedSection: {
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(231, 76, 60, 0.3)',
    },
    warningHeader: {
        alignItems: 'center',
        marginBottom: 8,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    footerText: {
        color: '#27ae60',
        fontSize: 14,
        fontWeight: '600',
    }

});

export default TermsOfService;
