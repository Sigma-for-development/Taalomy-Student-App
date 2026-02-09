import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, StyleSheet, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
    value?: Date;
    onChange: (date: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
    disabled?: boolean;
    placeholder?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    maximumDate,
    minimumDate,
    disabled = false,
    placeholder = 'Select Date of Birth',
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(value || new Date());

    const dayScrollRef = useRef<ScrollView>(null);
    const monthScrollRef = useRef<ScrollView>(null);
    const yearScrollRef = useRef<ScrollView>(null);

    const formatDate = (date?: Date): string => {
        if (!date) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };



    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (selectedDate) {
                onChange(selectedDate);
            }
        } else if (Platform.OS === 'ios') {
            // On iOS, we just update the temp date as the user scrolls
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        } else {
            // Web
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };

    const handleWebConfirm = () => {
        onChange(tempDate);
        setShowPicker(false);
    };

    const handleWebCancel = () => {
        setTempDate(value || new Date());
        setShowPicker(false);
    };

    // Auto-scroll to current date when picker opens
    useEffect(() => {
        if (showPicker && Platform.OS === 'web') {
            // Small delay to ensure the modal is rendered
            setTimeout(() => {
                const currentDay = tempDate.getDate();
                const currentMonth = tempDate.getMonth();
                const currentYear = tempDate.getFullYear();
                const years = Array.from({ length: 150 }, (_, i) => new Date().getFullYear() + 50 - i);
                const yearIndex = years.indexOf(currentYear);

                // Scroll to center the selected item (each item is ~44px tall)
                const itemHeight = 44;
                const containerHeight = 200;
                const offset = itemHeight / 2 - containerHeight / 2;

                dayScrollRef.current?.scrollTo({ y: (currentDay - 1) * itemHeight + offset, animated: false });
                monthScrollRef.current?.scrollTo({ y: currentMonth * itemHeight + offset, animated: false });
                yearScrollRef.current?.scrollTo({ y: yearIndex * itemHeight + offset, animated: false });
            }, 100);
        }
    }, [showPicker]);

    const renderWebPicker = () => {
        const currentYear = new Date().getFullYear();
        // Generate years: 100 years in the past and 50 years in the future
        const years = Array.from({ length: 150 }, (_, i) => currentYear + 50 - i);
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const days = Array.from({ length: 31 }, (_, i) => i + 1);

        return (
            <Modal
                visible={showPicker}
                transparent
                animationType="fade"
                onRequestClose={handleWebCancel}
            >
                <View style={styles.webModalOverlay}>
                    <View style={styles.webModalContent}>
                        <View style={styles.webModalHeader}>
                            <Text style={styles.webModalTitle}>Select Date of Birth</Text>
                            <TouchableOpacity onPress={handleWebCancel}>
                                <Ionicons name="close" size={24} color="#ecf0f1" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.webPickerContainer}>
                            {/* Day Picker */}
                            <View style={styles.webPickerColumn}>
                                <Text style={styles.webPickerLabel}>Day</Text>
                                <ScrollView
                                    ref={dayScrollRef}
                                    style={styles.webPickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {days.map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.webPickerItem,
                                                tempDate.getDate() === day && styles.webPickerItemSelected,
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(tempDate);
                                                newDate.setDate(day);
                                                setTempDate(newDate);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.webPickerItemText,
                                                    tempDate.getDate() === day && styles.webPickerItemTextSelected,
                                                ]}
                                            >
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Month Picker */}
                            <View style={styles.webPickerColumn}>
                                <Text style={styles.webPickerLabel}>Month</Text>
                                <ScrollView
                                    ref={monthScrollRef}
                                    style={styles.webPickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {months.map((month, index) => (
                                        <TouchableOpacity
                                            key={month}
                                            style={[
                                                styles.webPickerItem,
                                                tempDate.getMonth() === index && styles.webPickerItemSelected,
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(tempDate);
                                                newDate.setMonth(index);
                                                setTempDate(newDate);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.webPickerItemText,
                                                    tempDate.getMonth() === index && styles.webPickerItemTextSelected,
                                                ]}
                                            >
                                                {month}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Year Picker */}
                            <View style={styles.webPickerColumn}>
                                <Text style={styles.webPickerLabel}>Year</Text>
                                <ScrollView
                                    ref={yearScrollRef}
                                    style={styles.webPickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {years.map((year) => (
                                        <TouchableOpacity
                                            key={year}
                                            style={[
                                                styles.webPickerItem,
                                                tempDate.getFullYear() === year && styles.webPickerItemSelected,
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(tempDate);
                                                newDate.setFullYear(year);
                                                setTempDate(newDate);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.webPickerItemText,
                                                    tempDate.getFullYear() === year && styles.webPickerItemTextSelected,
                                                ]}
                                            >
                                                {year}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.webModalFooter}>
                            <TouchableOpacity
                                style={[styles.webModalButton, styles.webModalButtonCancel]}
                                onPress={handleWebCancel}
                            >
                                <Text style={styles.webModalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.webModalButton, styles.webModalButtonConfirm]}
                                onPress={handleWebConfirm}
                            >
                                <Text style={styles.webModalButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View>
            <TouchableOpacity
                style={[
                    styles.datePickerButton,
                    disabled && styles.datePickerButtonDisabled,
                ]}
                onPress={() => {
                    if (!disabled) {
                        setTempDate(value || new Date());
                        setShowPicker(true);
                    }
                }}
                disabled={disabled}
            >
                <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={value ? '#3498db' : '#666'}
                    style={styles.calendarIcon}
                />
                <Text
                    style={[
                        styles.datePickerText,
                        !value && styles.datePickerPlaceholder,
                    ]}
                >
                    {value ? formatDate(value) : placeholder}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={20}
                    color="#95a5a6"
                />
            </TouchableOpacity>

            {Platform.OS === 'web' ? (
                renderWebPicker()
            ) : (
                showPicker && (
                    <>
                        {Platform.OS === 'ios' && (
                            <Modal
                                visible={showPicker}
                                transparent
                                animationType="slide"
                                onRequestClose={() => setShowPicker(false)}
                            >
                                <View style={styles.iosModalOverlay}>
                                    <View style={styles.iosModalContent}>
                                        <View style={styles.iosModalHeader}>
                                            <TouchableOpacity onPress={() => {
                                                onChange(tempDate);
                                                setShowPicker(false);
                                            }}>
                                                <Text style={styles.iosModalDoneButton}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <DateTimePicker
                                            value={tempDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={handleDateChange}
                                            maximumDate={maximumDate}
                                            minimumDate={minimumDate}
                                            textColor="#ecf0f1"
                                            style={styles.iosDatePicker}
                                            locale="en-GB"
                                        />
                                    </View>
                                </View>
                            </Modal>
                        )}
                        {Platform.OS === 'android' && (
                            <DateTimePicker
                                value={value || new Date()}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                maximumDate={maximumDate}
                                minimumDate={minimumDate}
                                locale="en-GB"
                            />
                        )}
                    </>
                )
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    datePickerButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    datePickerButtonDisabled: {
        opacity: 0.5,
    },
    calendarIcon: {
        marginEnd: 12,
    },
    datePickerText: {
        flex: 1,
        fontSize: 16,
        color: '#ecf0f1',
    },
    datePickerPlaceholder: {
        color: '#666',
    },
    // iOS Modal Styles
    iosModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    iosModalContent: {
        backgroundColor: '#1a1a1a',
        borderTopStartRadius: 20,
        borderTopEndRadius: 20,
        paddingBottom: 40,
    },
    iosModalHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    iosModalDoneButton: {
        fontSize: 17,
        fontWeight: '600',
        color: '#3498db',
    },
    iosDatePicker: {
        height: 200,
        width: '100%',
        alignSelf: 'center',
    },
    // Web Modal Styles
    webModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    webModalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        width: '90%',
        maxWidth: 500,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    webModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    webModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#ecf0f1',
    },
    webPickerContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
    },
    webPickerColumn: {
        flex: 1,
    },
    webPickerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#bdc3c7',
        marginBottom: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    webPickerScroll: {
        maxHeight: 200,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    webPickerItem: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    webPickerItemSelected: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
    },
    webPickerItemText: {
        fontSize: 14,
        color: '#95a5a6',
    },
    webPickerItemTextSelected: {
        color: '#3498db',
        fontWeight: '600',
    },
    webModalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    webModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    webModalButtonCancel: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    webModalButtonConfirm: {
        backgroundColor: '#3498db',
    },
    webModalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ecf0f1',
    },
});

export default DatePicker;
