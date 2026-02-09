import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    StyleSheet,
    Platform,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Country {
    name: string;
    dial_code: string;
    code: string;
    flag: string;
}

// Comprehensive list of countries
export const COUNTRIES: Country[] = [
    { name: 'Egypt', dial_code: '+20', code: 'EG', flag: '🇪🇬' },
    { name: 'Saudi Arabia', dial_code: '+966', code: 'SA', flag: '🇸🇦' },
    { name: 'United Arab Emirates', dial_code: '+971', code: 'AE', flag: '🇦🇪' },
];

interface CountryPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (country: Country) => void;
    allowedCountries?: string[]; // Array of country codes (e.g., ['SA', 'AE', 'EG'])
}

const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
    visible,
    onClose,
    onSelect,
    allowedCountries,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCountries = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let list = COUNTRIES;

        if (allowedCountries && allowedCountries.length > 0) {
            list = list.filter(c => allowedCountries.includes(c.code));
        }

        return list.filter(
            (country) =>
                country.name.toLowerCase().includes(query) ||
                country.dial_code.includes(query) ||
                country.code.toLowerCase().includes(query)
        );
    }, [searchQuery, allowedCountries]);

    const renderItem = ({ item }: { item: Country }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => {
                onSelect(item);
                onClose();
            }}
        >
            {Platform.OS === 'web' ? (
                <Image
                    source={{ uri: `https://flagcdn.com/w40/${item.code.toLowerCase()}.png` }}
                    style={{ width: 30, height: 20, marginEnd: 15, borderRadius: 2 }}
                />
            ) : (
                <Text style={styles.flag}>{item.flag}</Text>
            )}
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.dialCode}>{item.dial_code}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Country</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#ecf0f1" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#95a5a6" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search country or code..."
                            placeholderTextColor="#95a5a6"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                    </View>

                    <FlatList
                        style={{ flex: 1 }}
                        data={filteredCountries}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.code}
                        initialNumToRender={15}
                        maxToRenderPerBatch={20}
                        windowSize={10}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopStartRadius: 20,
        borderTopEndRadius: 20,
        height: '80%',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#ecf0f1',
    },
    closeButton: {
        padding: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchIcon: {
        marginEnd: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#ecf0f1',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    flag: {
        fontSize: 24,
        marginEnd: 15,
    },
    name: {
        flex: 1,
        fontSize: 16,
        color: '#ecf0f1',
    },
    dialCode: {
        fontSize: 16,
        color: '#95a5a6',
        fontWeight: '500',
    },
});

export default CountryPickerModal;
