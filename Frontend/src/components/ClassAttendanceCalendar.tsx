import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDate } from '../utils/date';

const { width } = Dimensions.get('window');

interface AttendanceRecord {
    date: string;
    status: 'present' | 'absent';
    session_id?: number;
    session_time?: string;
    attendance_code?: string | null;
}

interface ClassSchedule {
    days_of_week: string[];
    start_date: string;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
}

interface ClassAttendanceCalendarProps {
    visible: boolean;
    onClose: () => void;
    classId: number;
    className: string;
    attendanceRecords: AttendanceRecord[];
    classSchedule: ClassSchedule;
    loading?: boolean;
}

const ClassAttendanceCalendar: React.FC<ClassAttendanceCalendarProps> = ({
    visible,
    onClose,
    classId,
    className,
    attendanceRecords,
    classSchedule,
    loading = false,
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);

    useEffect(() => {
        generateCalendar(currentMonth);
    }, [currentMonth, attendanceRecords]);

    const generateCalendar = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();

        // Get first day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get day of week for first day (0 = Sunday)
        const startingDayOfWeek = firstDay.getDay();

        // Generate calendar days
        const days: Date[] = [];

        // Add previous month's days to fill the first week
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            days.push(prevDate);
        }

        // Add current month's days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        // Add next month's days to complete the grid
        const remainingDays = 42 - days.length; // 6 weeks * 7 days
        for (let i = 1; i <= remainingDays; i++) {
            days.push(new Date(year, month + 1, i));
        }

        setCalendarDays(days);
    };

    const getSessionsForDate = (date: Date): AttendanceRecord[] => {
        const dateStr = date.toISOString().split('T')[0];
        return attendanceRecords.filter(r => r.date === dateStr);
    };

    const handleDayPress = (date: Date) => {
        const sessions = getSessionsForDate(date);
        if (sessions.length > 0) {
            setSelectedDate(date);
            setDetailsVisible(true);
        }
    };

    const getAttendanceStatus = (date: Date): 'present' | 'absent' | 'no-class' | 'future' | 'other-month' => {
        const dateStr = date.toISOString().split('T')[0];
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        // Check if date is in a different month
        if (date.getMonth() !== currentMonth.getMonth()) {
            return 'other-month';
        }

        // Check if date is in the future
        if (date > currentDate) {
            return 'future';
        }

        // Check if date is before class started
        if (classSchedule.start_date && date < new Date(classSchedule.start_date)) {
            return 'future';
        }

        // Check if date is after class ended
        if (classSchedule.end_date && date > new Date(classSchedule.end_date)) {
            return 'future';
        }

        // Check if there are any sessions on this date
        const sessions = getSessionsForDate(date);
        if (sessions.length > 0) {
            // If any session is present, show as present
            const hasPresent = sessions.some(s => s.status === 'present');
            return hasPresent ? 'present' : 'absent';
        }

        // Check if this day is a class day
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const isClassDay = classSchedule.days_of_week.includes(dayName);

        if (!isClassDay) {
            return 'no-class';
        }

        // If it's a class day but no record, it means no session happened yet
        return 'no-class';
    };

    const getDayStyle = (status: string) => {
        switch (status) {
            case 'present':
                return styles.presentDay;
            case 'absent':
                return styles.absentDay;
            case 'no-class':
                return styles.noClassDay;
            case 'future':
                return styles.futureDay;
            case 'other-month':
                return styles.otherMonthDay;
            default:
                return styles.defaultDay;
        }
    };

    const getDayTextStyle = (status: string) => {
        switch (status) {
            case 'present':
                return styles.presentDayText;
            case 'absent':
                return styles.absentDayText;
            case 'other-month':
                return styles.otherMonthDayText;
            default:
                return styles.dayText;
        }
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const monthName = formatDate(currentMonth, { month: 'long', year: 'numeric' });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <LinearGradient
                        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                        style={styles.backgroundGradient}
                    />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.headerTitle}>{className}</Text>
                            <Text style={styles.headerSubtitle}>Attendance Calendar</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#3498db" />
                            <Text style={styles.loadingText}>Loading calendar...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                            {/* Month Navigation */}
                            <View style={styles.monthNavigation}>
                                <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                                    <Ionicons name="chevron-back" size={24} color="#3498db" />
                                </TouchableOpacity>
                                <Text style={styles.monthText}>{monthName}</Text>
                                <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                                    <Ionicons name="chevron-forward" size={24} color="#3498db" />
                                </TouchableOpacity>
                            </View>

                            {/* Weekday Headers */}
                            <View style={styles.weekdayRow}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <Text key={day} style={styles.weekdayText}>{day}</Text>
                                ))}
                            </View>

                            {/* Calendar Grid */}
                            <View style={styles.calendarGrid}>
                                {calendarDays.map((date, index) => {
                                    const status = getAttendanceStatus(date);
                                    const sessions = getSessionsForDate(date);
                                    const hasSession = sessions.length > 0;

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.dayCell, getDayStyle(status)]}
                                            onPress={() => handleDayPress(date)}
                                            disabled={!hasSession}
                                            activeOpacity={hasSession ? 0.7 : 1}
                                        >
                                            <Text style={[styles.dayText, getDayTextStyle(status)]}>
                                                {date.getDate()}
                                            </Text>
                                            {sessions.length > 1 && (
                                                <View style={styles.sessionBadge}>
                                                    <Text style={styles.sessionBadgeText}>{sessions.length}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Legend */}
                            <View style={styles.legend}>
                                <Text style={styles.legendTitle}>Legend:</Text>
                                <View style={styles.legendRow}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendColor, styles.presentDay]} />
                                        <Text style={styles.legendText}>Attended</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendColor, styles.absentDay]} />
                                        <Text style={styles.legendText}>Absent</Text>
                                    </View>
                                </View>
                                <View style={styles.legendRow}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendColor, styles.noClassDay]} />
                                        <Text style={styles.legendText}>No Class</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendColor, styles.futureDay]} />
                                        <Text style={styles.legendText}>Future/N/A</Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    )}
                </View>

                {/* Session Details Modal */}
                <Modal
                    visible={detailsVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setDetailsVisible(false)}
                >
                    <View style={styles.detailsOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setDetailsVisible(false)}
                        />
                        <View style={styles.detailsContent}>
                            <View style={styles.detailsHeader}>
                                <Text style={styles.detailsTitle}>
                                    {selectedDate && formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setDetailsVisible(false)}
                                    style={styles.closeIconButton}
                                >
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {selectedDate && (() => {
                                const sessions = getSessionsForDate(selectedDate);
                                const presentCount = sessions.filter(s => s.status === 'present').length;
                                const absentCount = sessions.filter(s => s.status === 'absent').length;

                                return (
                                    <>
                                        <View style={styles.summaryContainer}>
                                            <View style={styles.summaryItem}>
                                                <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                                                <Text style={styles.summaryText}>{presentCount} Attended</Text>
                                            </View>
                                            <View style={styles.summaryItem}>
                                                <Ionicons name="close-circle" size={20} color="#e74c3c" />
                                                <Text style={styles.summaryText}>{absentCount} Missed</Text>
                                            </View>
                                            <View style={styles.summaryItem}>
                                                <Ionicons name="list" size={20} color="#3498db" />
                                                <Text style={styles.summaryText}>{sessions.length} Total</Text>
                                            </View>
                                        </View>

                                        <ScrollView
                                            style={styles.sessionsList}
                                            showsVerticalScrollIndicator={true}
                                            nestedScrollEnabled={true}
                                        >
                                            {sessions.map((session, index) => (
                                                <View key={index} style={styles.sessionItem}>
                                                    <View style={styles.sessionHeader}>
                                                        <Ionicons
                                                            name={session.status === 'present' ? 'checkmark-circle' : 'close-circle'}
                                                            size={20}
                                                            color={session.status === 'present' ? '#2ecc71' : '#e74c3c'}
                                                        />
                                                        <Text style={styles.sessionStatus}>
                                                            Session {index + 1}: {session.status === 'present' ? 'Attended' : 'Absent'}
                                                        </Text>
                                                    </View>
                                                    {session.session_time && (
                                                        <Text style={styles.sessionTime}>
                                                            {formatDate(session.session_time, { hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                    )}
                                                    {session.status === 'absent' && session.attendance_code && (
                                                        <Text style={styles.sessionCode}>
                                                            Code: {session.attendance_code}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </ScrollView>

                                        <TouchableOpacity
                                            style={styles.closeDetailsButton}
                                            onPress={() => setDetailsVisible(false)}
                                        >
                                            <Text style={styles.closeDetailsText}>Close</Text>
                                        </TouchableOpacity>
                                    </>
                                );
                            })()}
                        </View>
                    </View>
                </Modal>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '90%',
        backgroundColor: '#0a0a0a',
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        overflow: 'hidden',
    },
    backgroundGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 30,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerLeft: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#bdc3c7',
        marginTop: 4,
    },
    closeButton: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#bdc3c7',
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    monthNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    navButton: {
        padding: 8,
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    weekdayText: {
        width: (width - 40) / 7,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#7f8c8d',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: (width - 40) / 7,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderRadius: 8,
    },
    dayText: {
        fontSize: 14,
        color: '#ecf0f1',
    },
    presentDay: {
        backgroundColor: 'rgba(46, 204, 113, 0.3)',
        borderWidth: 1,
        borderColor: '#2ecc71',
    },
    presentDayText: {
        color: '#2ecc71',
        fontWeight: 'bold',
    },
    absentDay: {
        backgroundColor: 'rgba(231, 76, 60, 0.3)',
        borderWidth: 1,
        borderColor: '#e74c3c',
    },
    absentDayText: {
        color: '#e74c3c',
        fontWeight: 'bold',
    },
    noClassDay: {
        backgroundColor: 'rgba(127, 140, 141, 0.2)',
    },
    futureDay: {
        backgroundColor: 'transparent',
    },
    otherMonthDay: {
        backgroundColor: 'transparent',
    },
    otherMonthDayText: {
        color: '#34495e',
    },
    defaultDay: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    legend: {
        marginTop: 24,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendColor: {
        width: 24,
        height: 24,
        borderRadius: 6,
        marginEnd: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#bdc3c7',
    },
    sessionBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#3498db',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sessionBadgeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    detailsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    detailsContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    closeIconButton: {
        padding: 4,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    summaryText: {
        fontSize: 13,
        color: '#bdc3c7',
        fontWeight: '600',
    },
    sessionsList: {
        maxHeight: 400,
    },
    sessionItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sessionStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginStart: 8,
    },
    sessionTime: {
        fontSize: 12,
        color: '#95a5a6',
        marginStart: 28,
    },
    sessionCode: {
        fontSize: 12,
        color: '#7f8c8d',
        fontStyle: 'italic',
        marginStart: 28,
    },
    closeDetailsButton: {
        backgroundColor: '#3498db',
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
        alignItems: 'center',
    },
    closeDetailsText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

export default ClassAttendanceCalendar;
