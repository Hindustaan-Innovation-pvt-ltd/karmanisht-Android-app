// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AntDesign,
    Entypo,
    EvilIcons,
    Feather,
    FontAwesome,
    FontAwesome5,
    Fontisto,
    Foundation,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
    Octicons,
    SimpleLineIcons,
    Zocial
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { insforge } from '@/lib/insforge';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import SafeIcon from '@/components/safe-icon';

const shadowSm = Platform.OS === 'web'
    ? { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
    : { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 };

const shadowMd = Platform.OS === 'web'
    ? { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }
    : { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 };

const shadow2xl = Platform.OS === 'web'
    ? { boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }
    : { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 16 };

// Recommended/custom category icon representations in SafeIcon mapping
const RECOMMENDED_ICONS = [
    'zap', 'droplet', 'wind', 'refrigerator', 'washing-machine', 'tv', 'monitor',
    'microwave', 'flame', 'hammer', 'brick', 'paint-bucket', 'shield-check', 'layout',
    'construction', 'container', 'filter', 'bug', 'sparkles', 'fan', 'leaf', 'scissors',
    'dumbbell', 'stethoscope', 'utensils', 'users', 'car', 'shield', 'shirt', 'package',
    'key', 'waves', 'antenna', 'sun', 'battery-charging', 'wrench', 'palette', 'calendar',
    'file-text', 'truck'
];

// Define icon lists by families
const ICON_FAMILIES = {
    recommended: { label: 'Recommended', icons: RECOMMENDED_ICONS },
    antdesign: { label: 'AntDesign', icons: [] as string[] },
    entypo: { label: 'Entypo', icons: [] as string[] },
    evilicons: { label: 'EvilIcons', icons: [] as string[] },
    feather: { label: 'Feather', icons: [] as string[] },
    fontawesome: { label: 'FontAwesome', icons: [] as string[] },
    fontawesome5: { label: 'FontAwesome5', icons: [] as string[] },
    fontisto: { label: 'Fontisto', icons: [] as string[] },
    foundation: { label: 'Foundation', icons: [] as string[] },
    ionicons: { label: 'Ionicons', icons: [] as string[] },
    materialcommunityicons: { label: 'MaterialCommunity', icons: [] as string[] },
    materialicons: { label: 'MaterialIcons', icons: [] as string[] },
    octicons: { label: 'Octicons', icons: [] as string[] },
    simplelineicons: { label: 'SimpleLine', icons: [] as string[] },
    zocial: { label: 'Zocial', icons: [] as string[] }
};

const fillFamilyIcons = (familyKey: keyof typeof ICON_FAMILIES, component: any) => {
    try {
        if (component && component.glyphMap) {
            ICON_FAMILIES[familyKey].icons = Object.keys(component.glyphMap).sort();
        }
    } catch (e) {
        console.warn(`Failed to load ${familyKey} icons glyphMap:`, e);
    }
};

fillFamilyIcons('antdesign', AntDesign);
fillFamilyIcons('entypo', Entypo);
fillFamilyIcons('evilicons', EvilIcons);
fillFamilyIcons('feather', Feather);
fillFamilyIcons('fontawesome', FontAwesome);
fillFamilyIcons('fontawesome5', FontAwesome5);
fillFamilyIcons('fontisto', Fontisto);
fillFamilyIcons('foundation', Foundation);
fillFamilyIcons('ionicons', Ionicons);
fillFamilyIcons('materialcommunityicons', MaterialCommunityIcons);
fillFamilyIcons('materialicons', MaterialIcons);
fillFamilyIcons('octicons', Octicons);
fillFamilyIcons('simplelineicons', SimpleLineIcons);
fillFamilyIcons('zocial', Zocial);

function IconPickerModal({ visible, onClose, onSelect, currentIcon, isDark }: {
    visible: boolean;
    onClose: () => void;
    onSelect: (name: string) => void;
    currentIcon: string;
    isDark: boolean;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<keyof typeof ICON_FAMILIES>('recommended');

    useEffect(() => {
        if (visible) {
            setSearchQuery('');
        }
    }, [visible]);

    const getFilteredIcons = () => {
        const query = searchQuery.trim().toLowerCase();
        const sourceList = ICON_FAMILIES[activeTab]?.icons || [];

        if (!query) return sourceList;
        return sourceList.filter(name => name.toLowerCase().includes(query));
    };

    const filteredIcons = getFilteredIcons();
    // Limit to first 120 matching icons to keep the rendering extremely fast in React Native!
    const displayedIcons = filteredIcons.slice(0, 120);

    const bgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 items-center justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <View className={`w-full h-[85%] p-6 rounded-t-[36px] border-t ${bgClass}`} style={shadow2xl}>
                    <View className={`w-12 h-1.5 rounded-full self-center mb-5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    <View className="flex-row justify-between items-center mb-4">
                        <View>
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Choose Category Icon</Text>
                            <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Select an icon representation</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className={`w-9 h-9 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                        >
                            <Ionicons name="close" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
                        </TouchableOpacity>
                    </View>

                    <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <Feather name="search" size={16} color="#64748B" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search available icons by name..."
                            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                            className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                        />
                    </View>

                    <View className="mb-4">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                        >
                            {Object.entries(ICON_FAMILIES).map(([id, family]) => {
                                const active = activeTab === id;
                                return (
                                    <TouchableOpacity
                                        key={id}
                                        onPress={() => setActiveTab(id as any)}
                                        className={`px-4 py-2.5 rounded-full border ${active
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : (isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200')
                                            }`}
                                    >
                                        <Text className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-white' : 'text-slate-400'
                                            }`}>
                                            {family.label} ({family.icons.length})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        {displayedIcons.length === 0 ? (
                            <View className="py-16 items-center justify-center">
                                <Feather name="help-circle" size={40} color="#64748B" style={{ opacity: 0.4 }} />
                                <Text className="text-xs font-bold text-slate-400 mt-3 tracking-widest uppercase">No icons found</Text>
                            </View>
                        ) : (
                            <View className="flex-row flex-wrap gap-2.5 mb-10 justify-start">
                                {displayedIcons.map(name => {
                                    const isSelected = currentIcon === name;
                                    return (
                                        <TouchableOpacity
                                            key={name}
                                            onPress={() => {
                                                onSelect(name);
                                                onClose();
                                            }}
                                            className={`w-[22%] aspect-square rounded-2xl items-center justify-center border ${isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                                                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                                                }`}
                                        >
                                            <SafeIcon name={name} size={22} color={isSelected ? '#6366F1' : (isDark ? '#94A3B8' : '#475569')} />
                                            <Text
                                                className={`text-[8px] font-bold mt-1.5 text-center px-1 leading-tight ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                        {filteredIcons.length > 120 && (
                            <Text className="text-center text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-10">
                                showing first 120 matches (refine search for more)
                            </Text>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

export default function AdminCategoriesConsole() {
    const router = useRouter();
    const { fetchCategories } = useAppStore();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [tagsList, setTagsList] = useState<any[]>([]);

    // Category Creation Modal state
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('tool');
    const [newCategoryActive, setNewCategoryActive] = useState(true);
    const [submittingCategory, setSubmittingCategory] = useState(false);

    // Specialty Tags Modal state
    const [tagsModalVisible, setTagsModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [submittingTag, setSubmittingTag] = useState(false);

    // Dropdown active card state
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Active Category Filter status
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Edit Category Modal state
    const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [editCategoryIcon, setEditCategoryIcon] = useState('');
    const [editCategoryActive, setEditCategoryActive] = useState(true);
    const [updatingCategory, setUpdatingCategory] = useState(false);

    // Edit Subcategory (Tag) Modal state
    const [editTagModalVisible, setEditTagModalVisible] = useState(false);
    const [selectedTag, setSelectedTag] = useState<any | null>(null);
    const [editTagName, setEditTagName] = useState('');
    const [updatingTag, setUpdatingTag] = useState(false);

    // Icon Picker target selection state
    const [pickerTarget, setPickerTarget] = useState<'create' | 'edit' | null>(null);

    const fetchCategoriesAndTags = async (isRef = false) => {
        if (isRef) setRefreshing(true);
        else setLoading(true);

        try {
            // Fetch categories
            const { data: catData, error: catErr } = await insforge.database
                .from('service_categories')
                .select('*')
                .order('name', { ascending: true });
            if (catErr) throw catErr;
            setCategoriesList(catData || []);

            // Fetch tags
            const { data: tagData, error: tagErr } = await insforge.database
                .from('service_tags')
                .select('*')
                .order('name', { ascending: true });
            if (tagErr) throw tagErr;
            setTagsList(tagData || []);

        } catch (err) {
            console.error(err);
            Alert.alert("Database Error", "Failed to retrieve categories and tags.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCategoriesAndTags();
    }, []);

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert("Input Error", "Please enter a category name.");
            return;
        }
        setSubmittingCategory(true);
        try {
            const { error } = await insforge.database
                .from('service_categories')
                .insert([
                    {
                        name: newCategoryName.trim(),
                        icon: newCategoryIcon.trim() || 'tool',
                        is_active: newCategoryActive
                    }
                ]);
            if (error) throw error;

            // Proactively register/upsert translation key for the category name
            try {
                await useAppStore.getState().upsertTranslation(
                    newCategoryName.trim(),
                    newCategoryName.trim(),
                    newCategoryName.trim()
                );
            } catch (transErr) {
                console.warn('[CategoriesConsole] Failed to register category translation key:', transErr);
            }

            Alert.alert("Success", "Category created successfully!");
            setNewCategoryName('');
            setNewCategoryIcon('tool');
            setNewCategoryActive(true);
            setCreateModalVisible(false);

            await fetchCategoriesAndTags();
            await fetchCategories(true);
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to insert new category.");
        } finally {
            setSubmittingCategory(false);
        }
    };

    const handleCreateTag = async () => {
        if (!selectedCategory) return;
        if (!newTagName.trim()) {
            Alert.alert("Input Error", "Please enter a tag name.");
            return;
        }
        setSubmittingTag(true);
        try {
            const { error } = await insforge.database
                .from('service_tags')
                .insert([
                    {
                        category_id: selectedCategory.id,
                        name: newTagName.trim()
                    }
                ]);
            if (error) throw error;

            // Proactively register/upsert translation key for the tag name
            try {
                await useAppStore.getState().upsertTranslation(
                    newTagName.trim(),
                    newTagName.trim(),
                    newTagName.trim()
                );
            } catch (transErr) {
                console.warn('[CategoriesConsole] Failed to register tag translation key:', transErr);
            }

            setNewTagName('');
            await fetchCategoriesAndTags();
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to insert new tag.");
        } finally {
            setSubmittingTag(false);
        }
    };

    const handleUpdateCategory = async () => {
        if (!selectedCategory) return;
        if (!editCategoryName.trim()) {
            Alert.alert("Input Error", "Please enter a category name.");
            return;
        }
        setUpdatingCategory(true);
        try {
            const { error } = await insforge.database
                .from('service_categories')
                .update({
                    name: editCategoryName.trim(),
                    icon: editCategoryIcon.trim() || 'tool',
                    is_active: editCategoryActive
                })
                .eq('id', selectedCategory.id);
            if (error) throw error;

            // Proactively register/upsert translation key for the category name
            try {
                await useAppStore.getState().upsertTranslation(
                    editCategoryName.trim(),
                    editCategoryName.trim(),
                    editCategoryName.trim()
                );
            } catch (transErr) {
                console.warn('[CategoriesConsole] Failed to register category translation key:', transErr);
            }

            Alert.alert("Success", "Category updated successfully!");
            setEditCategoryModalVisible(false);
            setSelectedCategory(null);
            await fetchCategoriesAndTags();
            await fetchCategories(true);
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to update category.");
        } finally {
            setUpdatingCategory(false);
        }
    };

    const handleOpenEditTag = (tag: any) => {
        setSelectedTag(tag);
        setEditTagName(tag.name || '');
        setEditTagModalVisible(true);
    };

    const handleUpdateTag = async () => {
        if (!selectedTag) return;
        if (!editTagName.trim()) {
            Alert.alert("Input Error", "Please enter a tag name.");
            return;
        }
        setUpdatingTag(true);
        try {
            const { error } = await insforge.database
                .from('service_tags')
                .update({
                    name: editTagName.trim()
                })
                .eq('id', selectedTag.id);
            if (error) throw error;

            // Proactively register/upsert translation key for the tag name
            try {
                await useAppStore.getState().upsertTranslation(
                    editTagName.trim(),
                    editTagName.trim(),
                    editTagName.trim()
                );
            } catch (transErr) {
                console.warn('[CategoriesConsole] Failed to register tag translation key:', transErr);
            }

            Alert.alert("Success", "Specialty tag updated successfully!");
            setEditTagModalVisible(false);
            setSelectedTag(null);
            await fetchCategoriesAndTags();
        } catch (err: any) {
            console.error(err);
            Alert.alert("Database Error", err.message || "Failed to update specialty tag.");
        } finally {
            setUpdatingTag(false);
        }
    };

    const toggleCategoryActive = async (categoryId: string, currentStatus: boolean) => {
        try {
            const { error } = await insforge.database
                .from('service_categories')
                .update({ is_active: !currentStatus })
                .eq('id', categoryId);
            if (error) throw error;
            await fetchCategoriesAndTags();
            await fetchCategories(true);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update category status.");
        }
    };

    const deleteTag = async (tagId: string) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this specialty tag?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await insforge.database
                                .from('service_tags')
                                .delete()
                                .eq('id', tagId);
                            if (error) throw error;
                            await fetchCategoriesAndTags();
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to delete tag.");
                        }
                    }
                }
            ]
        );
    };

    // Filter categories based on search
    const getFilteredCategories = () => {
        let list = categoriesList;
        if (activeFilter === 'active') {
            list = categoriesList.filter(c => c.is_active !== false);
        } else if (activeFilter === 'inactive') {
            list = categoriesList.filter(c => c.is_active === false);
        }

        const query = searchQuery.toLowerCase();
        if (!query) return list;
        return list.filter(c =>
            (c.name || '').toLowerCase().includes(query) ||
            tagsList.some(t => t.category_id === c.id && (t.name || '').toLowerCase().includes(query))
        );
    };

    const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
    const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
    const textMainClass = isDark ? 'text-slate-100' : 'text-slate-900';

    const searchBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

    return (
        <View className={`flex-1 ${bgClass}`} style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className={`pt-4 pb-5 px-6 flex-row items-center justify-between border-b ${isDark ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                    >
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View>
                        <Text className={`text-2xl font-black tracking-tight ${textMainClass}`}>Categories</Text>
                        <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Admin</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => fetchCategoriesAndTags(true)}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
                >
                    <Feather name="refresh-cw" size={18} color="#6366F1" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 px-5 pt-5">
                {/* Trigger Add Category Modal */}
                <TouchableOpacity
                    onPress={() => setCreateModalVisible(true)}
                    className="flex-row items-center justify-center py-3.5 rounded-[22px] border border-dashed border-indigo-500/50 bg-indigo-500/5 mb-4 active:scale-98"
                >
                    <Feather name="plus-circle" size={18} color="#6366F1" />
                    <Text className="text-sm font-black text-indigo-600 dark:text-indigo-400 ml-2 uppercase tracking-wider">Add New Category</Text>
                </TouchableOpacity>

                {/* Search Bar */}
                <View className={`flex-row items-center px-4 py-3 rounded-2xl mb-4 border ${searchBgClass}`}>
                    <Feather name="search" size={18} color="#64748B" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search categories or specialties..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        className={`flex-1 ml-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                    />
                </View>

                {/* Premium Active/Inactive Filter Tabs */}
                <View className="flex-row gap-2 mb-4 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                    {(['all', 'active', 'inactive'] as const).map((filter) => {
                        const isSelected = activeFilter === filter;
                        const label = filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Disabled';
                        
                        // Compute category counts for each status
                        let count = categoriesList.length;
                        if (filter === 'active') {
                            count = categoriesList.filter(c => c.is_active !== false).length;
                        } else if (filter === 'inactive') {
                            count = categoriesList.filter(c => c.is_active === false).length;
                        }

                        return (
                            <TouchableOpacity
                                key={filter}
                                onPress={() => setActiveFilter(filter)}
                                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                                        : 'border-transparent'
                                }`}
                            >
                                <Text className={`text-[10px] font-black uppercase tracking-wider ${
                                    isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                }`}>
                                    {label}
                                </Text>
                                <View className={`ml-2 px-1.5 py-0.5 rounded-full ${
                                    isSelected
                                        ? 'bg-indigo-50 dark:bg-indigo-950/50'
                                        : 'bg-slate-200/50 dark:bg-slate-800/40'
                                }`}>
                                    <Text className={`text-[9px] font-extrabold ${
                                        isSelected ? 'text-indigo-650 dark:text-indigo-450' : 'text-slate-500'
                                    }`}>
                                        {count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="text-xs font-bold text-slate-500 mt-4 tracking-widest uppercase">Fetching categories...</Text>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => fetchCategoriesAndTags(true)} colors={['#6366F1']} />
                        }
                    >
                        {getFilteredCategories().length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <MaterialCommunityIcons name="tag-multiple-outline" size={48} color="#64748B" />
                                <Text className="text-xs font-bold text-slate-400 mt-4 tracking-widest">NO MATCHING CATEGORIES</Text>
                            </View>
                        ) : (
                            <View className="flex-row flex-wrap justify-between gap-y-4 mb-10">
                                {getFilteredCategories().map((cat) => {
                                    const categoryTags = tagsList.filter(t => t.category_id === cat.id);
                                    const isActive = cat.is_active !== false;
                                    return (
                                        <View
                                            key={cat.id}
                                            className={`w-[48%] p-4 rounded-3xl border relative ${cardBgClass} ${
                                                !isActive ? 'opacity-65 border-dashed border-slate-350 dark:border-slate-800' : ''
                                            }`}
                                            style={shadowSm}
                                        >
                                            {/* Card Top Row with Icon Frame & Settings Dropdown Toggle */}
                                            <View className="flex-row justify-between items-center mb-3.5">
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedCategory(cat);
                                                        setTagsModalVisible(true);
                                                    }}
                                                    className={`w-10 h-10 rounded-2xl items-center justify-center border ${isActive
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100/60 dark:border-indigo-900/30'
                                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                        }`}
                                                >
                                                    <SafeIcon name={cat.icon || 'tool'} size={18} color={isActive ? "#6366F1" : "#64748B"} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => setActiveMenuId(activeMenuId === cat.id ? null : cat.id)}
                                                    className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                                                >
                                                    <Feather name="more-vertical" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Category Information */}
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedCategory(cat);
                                                    setTagsModalVisible(true);
                                                }}
                                            >
                                                <Text className={`text-base font-black tracking-tight leading-tight ${textMainClass}`}>{cat.name}</Text>

                                                <View className="flex-row items-center mt-2 gap-1.5">
                                                    <View className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                    <Text className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                                                        {isActive ? 'Active' : 'Disabled'}
                                                    </Text>
                                                </View>

                                                {/* Inline specialty tag capsules */}
                                                {categoryTags.length > 0 && (
                                                    <View className="flex-row flex-wrap gap-1 mt-3">
                                                        {categoryTags.slice(0, 2).map(tag => (
                                                            <View
                                                                key={tag.id}
                                                                className={`px-2 py-0.5 rounded-full border ${isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}
                                                            >
                                                                <Text className={`text-[9px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tag.name}</Text>
                                                            </View>
                                                        ))}
                                                        {categoryTags.length > 2 && (
                                                            <View className={`px-2 py-0.5 rounded-full border ${isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                                                                <Text className={`text-[9px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-650'}`}>+{categoryTags.length - 2}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}

                                                <View className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex-row items-center gap-1.5">
                                                    <Feather name="tag" size={11} color="#A855F7" />
                                                    <Text className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                                        {categoryTags.length} {categoryTags.length === 1 ? 'specialty' : 'specialties'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>

                                            {/* Elegant Local Dropdown Actions Overlay */}
                                            {activeMenuId === cat.id && (
                                                <View
                                                    className={`absolute right-3 top-11 z-50 rounded-2xl border p-1 w-[120px] ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                                                        }`}
                                                    style={shadowMd}
                                                >
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            toggleCategoryActive(cat.id, isActive);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="flex-row items-center px-3 py-2.5 gap-2 active:bg-slate-100 dark:active:bg-slate-800 rounded-xl"
                                                    >
                                                        <Feather name={isActive ? "slash" : "check"} size={13} color={isActive ? "#EF4444" : "#22C55E"} />
                                                        <Text className={`text-[10px] font-black uppercase tracking-wider ${textMainClass}`}>
                                                            {isActive ? 'Disable' : 'Enable'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setSelectedCategory(cat);
                                                            setEditCategoryName(cat.name);
                                                            setEditCategoryIcon(cat.icon || 'tool');
                                                            setEditCategoryActive(cat.is_active !== false);
                                                            setEditCategoryModalVisible(true);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="flex-row items-center px-3 py-2.5 gap-2 border-t border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800 rounded-xl"
                                                    >
                                                        <Feather name="edit" size={13} color="#4F46E5" />
                                                        <Text className={`text-[10px] font-black uppercase tracking-wider ${textMainClass}`}>Edit Info</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setSelectedCategory(cat);
                                                            setTagsModalVisible(true);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="flex-row items-center px-3 py-2.5 gap-2 border-t border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800 rounded-xl"
                                                    >
                                                        <Feather name="edit-2" size={13} color="#6366F1" />
                                                        <Text className={`text-[10px] font-black uppercase tracking-wider ${textMainClass}`}>Edit Tags</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Create Category Modal Dialog */}
            <Modal
                visible={createModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View className="flex-1 items-center justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`w-full p-6 rounded-t-[36px] border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={shadow2xl}>
                        {/* Drawer bar */}
                        <View className={`w-12 h-1.5 rounded-full self-center mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Add New Category</Text>
                            <TouchableOpacity
                                onPress={() => setCreateModalVisible(false)}
                                className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-4">
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category Name</Text>
                                <TextInput
                                    value={newCategoryName}
                                    onChangeText={setNewCategoryName}
                                    placeholder="e.g. Electrician, Plumber, Painter..."
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                                        }`}
                                />
                            </View>

                            <View className="gap-2">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Icon</Text>
                                <View className="flex-row items-center gap-3">
                                    <View className={`w-14 h-14 rounded-2xl items-center justify-center border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                        <SafeIcon name={newCategoryIcon} size={24} color="#6366F1" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-sm font-bold ${textMainClass}`}>{newCategoryIcon || 'None Selected'}</Text>
                                        <Text className="text-[10px] text-slate-400 font-medium">Select a safe category icon from the picker</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setPickerTarget('create')}
                                        className="bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30"
                                    >
                                        <Text className="text-xs font-bold text-[#6366F1]">Choose Icon</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="flex-row items-center justify-between px-1 py-1 mt-1">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Status</Text>
                                    <Text className="text-[10px] text-slate-400 font-medium mt-0.5">Enable service category for consumers</Text>
                                </View>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setNewCategoryActive(!newCategoryActive)}
                                    className={`w-12 h-7 rounded-full p-1 flex-row items-center ${
                                        newCategoryActive ? 'bg-indigo-600 justify-end' : 'bg-slate-200 dark:bg-slate-800 justify-start'
                                    }`}
                                >
                                    <View className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-3 mt-4 mb-4">
                                <TouchableOpacity
                                    onPress={handleCreateCategory}
                                    className="flex-1 bg-indigo-600 py-4 rounded-2xl items-center"
                                    disabled={submittingCategory}
                                    style={Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' } : {}}
                                >
                                    {submittingCategory ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-sm font-bold text-white uppercase tracking-wider">Save Category</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Specialty Tags Management Modal Dialog */}
            <Modal
                visible={tagsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setTagsModalVisible(false)}
            >
                <View className="flex-1 items-center justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`w-full h-[80%] p-6 rounded-t-[36px] border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={shadow2xl}>
                        {/* Drawer bar */}
                        <View className={`w-12 h-1.5 rounded-full self-center mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        {selectedCategory && (
                            <View className="flex-1">
                                {/* Sticky Modal Header */}
                                <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <View className="flex-row items-center">
                                        <View
                                            className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                                        >
                                            <SafeIcon name={selectedCategory.icon || 'tool'} size={18} color="#6366F1" />
                                        </View>
                                        <View>
                                            <Text className={`text-lg font-black tracking-tight leading-tight ${textMainClass}`}>{selectedCategory.name}</Text>
                                            <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Specialties Definitions</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setTagsModalVisible(false);
                                            setSelectedCategory(null);
                                        }}
                                        className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                                    >
                                        <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                                    </TouchableOpacity>
                                </View>

                                {/* Tag Creation Input Bar */}
                                <View className="flex-row items-center mb-5 gap-2">
                                    <TextInput
                                        value={newTagName}
                                        onChangeText={setNewTagName}
                                        placeholder="Add new specialty (e.g. Fan Repair, Hair Styling)..."
                                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                        className={`flex-1 px-4 py-3 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                                            }`}
                                    />
                                    <TouchableOpacity
                                        onPress={handleCreateTag}
                                        className="bg-indigo-600 px-4 py-3.5 rounded-2xl"
                                        disabled={submittingTag}
                                    >
                                        {submittingTag ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text className="text-xs font-bold text-white uppercase tracking-wider">Add</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Badges Grid Container */}
                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sticky Tags Badges ({tagsList.filter(t => t.category_id === selectedCategory.id).length})</Text>

                                    <View className="flex-row flex-wrap gap-2.5">
                                        {tagsList.filter(t => t.category_id === selectedCategory.id).length === 0 ? (
                                            <View className="py-8 items-center justify-center w-full">
                                                <Feather name="tag" size={32} color="#64748B" style={{ opacity: 0.5 }} />
                                                <Text className="text-xs text-slate-400 font-semibold italic mt-2">No specialty tags defined yet.</Text>
                                            </View>
                                        ) : (
                                            tagsList.filter(t => t.category_id === selectedCategory.id).map((tag) => (
                                                <View
                                                    key={tag.id}
                                                    className={`flex-row items-center pl-4 pr-2.5 py-2 rounded-full border ${isDark ? 'bg-indigo-950/15 border-indigo-900/30' : 'bg-indigo-50/40 border-indigo-100'}`}
                                                >
                                                    <Text className={`text-xs font-extrabold ${isDark ? 'text-indigo-300' : 'text-indigo-750'}`}>{tag.name}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => handleOpenEditTag(tag)}
                                                        className="ml-2.5 p-1 bg-indigo-500/10 rounded-full active:scale-90"
                                                    >
                                                        <Feather name="edit-2" size={10} color="#6366F1" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => deleteTag(tag.id)}
                                                        className="ml-1.5 p-1 bg-rose-500/10 rounded-full active:scale-90"
                                                    >
                                                        <Feather name="x" size={10} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                    <View className="h-10" />
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Edit Category Modal Dialog */}
            <Modal
                visible={editCategoryModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditCategoryModalVisible(false)}
            >
                <View className="flex-1 items-center justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`w-full p-6 rounded-t-[36px] border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={shadow2xl}>
                        {/* Drawer bar */}
                        <View className={`w-12 h-1.5 rounded-full self-center mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Edit Category Info</Text>
                            <TouchableOpacity
                                onPress={() => setEditCategoryModalVisible(false)}
                                className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-4">
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category Name</Text>
                                <TextInput
                                    value={editCategoryName}
                                    onChangeText={setEditCategoryName}
                                    placeholder="e.g. Electrician, Plumber, Painter..."
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50/5 text-slate-800 border-slate-200'
                                        }`}
                                />
                            </View>

                            <View className="gap-2">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Icon</Text>
                                <View className="flex-row items-center gap-3">
                                    <View className={`w-14 h-14 rounded-2xl items-center justify-center border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                        <SafeIcon name={editCategoryIcon} size={24} color="#6366F1" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-sm font-bold ${textMainClass}`}>{editCategoryIcon || 'None Selected'}</Text>
                                        <Text className="text-[10px] text-slate-400 font-medium">Select a safe category icon from the picker</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setPickerTarget('edit')}
                                        className="bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30"
                                    >
                                        <Text className="text-xs font-bold text-[#6366F1]">Choose Icon</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="flex-row items-center justify-between px-1 py-1 mt-1">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Status</Text>
                                    <Text className="text-[10px] text-slate-400 font-medium mt-0.5">Enable service category for consumers</Text>
                                </View>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setEditCategoryActive(!editCategoryActive)}
                                    className={`w-12 h-7 rounded-full p-1 flex-row items-center ${
                                        editCategoryActive ? 'bg-indigo-600 justify-end' : 'bg-slate-200 dark:bg-slate-800 justify-start'
                                    }`}
                                >
                                    <View className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-3 mt-4 mb-4">
                                <TouchableOpacity
                                    onPress={handleUpdateCategory}
                                    className="flex-1 bg-indigo-600 py-4 rounded-2xl items-center"
                                    disabled={updatingCategory}
                                    style={Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' } : {}}
                                >
                                    {updatingCategory ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-sm font-bold text-white uppercase tracking-wider">Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Subcategory Modal Dialog */}
            <Modal
                visible={editTagModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditTagModalVisible(false)}
            >
                <View className="flex-1 items-center justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View className={`w-full p-6 rounded-t-[36px] border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={shadow2xl}>
                        {/* Drawer bar */}
                        <View className={`w-12 h-1.5 rounded-full self-center mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-black tracking-tight ${textMainClass}`}>Edit Specialty Tag</Text>
                            <TouchableOpacity
                                onPress={() => setEditTagModalVisible(false)}
                                className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-4">
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Specialty Tag Name</Text>
                                <TextInput
                                    value={editTagName}
                                    onChangeText={setEditTagName}
                                    placeholder="e.g. Fan Repair, Hair Styling..."
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50/5 text-slate-800 border-slate-200'
                                        }`}
                                />
                            </View>

                            <View className="flex-row gap-3 mt-4 mb-4">
                                <TouchableOpacity
                                    onPress={handleUpdateTag}
                                    className="flex-1 bg-indigo-600 py-4 rounded-2xl items-center"
                                    disabled={updatingTag}
                                    style={Platform.OS === 'web' ? { boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' } : {}}
                                >
                                    {updatingTag ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-sm font-bold text-white uppercase tracking-wider">Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Dynamic Premium Icon Picker Modal */}
            <IconPickerModal
                visible={pickerTarget !== null}
                onClose={() => setPickerTarget(null)}
                currentIcon={pickerTarget === 'create' ? newCategoryIcon : editCategoryIcon}
                isDark={isDark}
                onSelect={(selectedName) => {
                    if (pickerTarget === 'create') {
                        setNewCategoryIcon(selectedName);
                    } else if (pickerTarget === 'edit') {
                        setEditCategoryIcon(selectedName);
                    }
                }}
            />
        </View>
    );
}
