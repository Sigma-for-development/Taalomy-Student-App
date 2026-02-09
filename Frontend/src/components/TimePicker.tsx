import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, StyleSheet, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerProps {
    value?: Date;
    onChange: (date: Date) => void;
    disabled?: boolean;
    placeholder?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({
    value,
    onChange,
    disabled = false,
    placeholder = 'Select Time',
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(value || new Date());

    const hourScrollRef = useRef<ScrollView>(null);
    const minuteScrollRef = useRef<ScrollView>(null);

    const formatTime = (date?: Date): string => {
        if (!date) return '';
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
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

    // Auto-scroll to current time when picker opens
    useEffect(() => {
        if (showPicker && Platform.OS === 'web') {
            setTimeout(() => {
                const currentHour = tempDate.getHours();
                const currentMinute = tempDate.getMinutes();

                const itemHeight = 44;
                const containerHeight = 200;
                const offset = itemHeight / 2 - containerHeight / 2;

                hourScrollRef.current?.scrollTo({ y: currentHour * itemHeight + offset, animated: false });
                minuteScrollRef.current?.scrollTo({ y: currentMinute * itemHeight + offset, animated: false });
            }, 100);
        }
    }, [showPicker]);

    const renderWebPicker = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = Array.from({ length: 60 }, (_, i) => i);

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
                            <Text style={styles.webModalTitle}>Select Time</Text>
                            <TouchableOpacity onPress={handleWebCancel}>
                                <Ionicons name="close" size={24} color="#ecf0f1" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.webPickerContainer}>
                            {/* Hour Picker */}
                            <View style={styles.webPickerColumn}>
                                <Text style={styles.webPickerLabel}>Hour</Text>
                                <ScrollView
                                    ref={hourScrollRef}
                                    style={styles.webPickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {hours.map((hour) => (
                                        <TouchableOpacity
                                            key={hour}
                                            style={[
                                                styles.webPickerItem,
                                                tempDate.getHours() === hour && styles.webPickerItemSelected,
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(tempDate);
                                                newDate.setHours(hour);
                                                setTempDate(newDate);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.webPickerItemText,
                                                    tempDate.getHours() === hour && styles.webPickerItemTextSelected,
                                                ]}
                                            >
                                                {hour.toString().padStart(2, '0')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Minute Picker */}
                            <View style={styles.webPickerColumn}>
                                <Text style={styles.webPickerLabel}>Minute</Text>
                                <ScrollView
                                    ref={minuteScrollRef}
                                    style={styles.webPickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {minutes.map((minute) => (
                                        <TouchableOpacity
                                            key={minute}
                                            style={[
                                                styles.webPickerItem,
                                                tempDate.getMinutes() === minute && styles.webPickerItemSelected,
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(tempDate);
                                                newDate.setMinutes(minute);
                                                setTempDate(newDate);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.webPickerItemText,
                                                    tempDate.getMinutes() === minute && styles.webPickerItemTextSelected,
                                                ]}
                                            >
                                                {minute.toString().padStart(2, '0')}
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
                    name="time-outline"
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
                    {value ? formatTime(value) : placeholder}
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
                                            mode="time"
                                            display="spinner"
                                            onChange={handleDateChange}
                                            textColor="#ecf0f1"
                                            style={styles.iosDatePicker}
                                        />
                                    </View>
                                </View>
                            </Modal>
                        )}
                        {Platform.OS === 'android' && (
                            <DateTimePicker
                                value={value || new Date()}
                                mode="time"
                                display="default"
                                onChange={handleDateChange}
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
        maxWidth: 400,
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

export default TimePicker;
