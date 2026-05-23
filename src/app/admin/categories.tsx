// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, Platform, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
    const [submittingCategory, setSubmittingCategory] = useState(false);

    // Specialty Tags Modal state
    const [tagsModalVisible, setTagsModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [submittingTag, setSubmittingTag] = useState(false);

    // Dropdown active card state
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Edit Category Modal state
    const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [editCategoryIcon, setEditCategoryIcon] = useState('');
    const [updatingCategory, setUpdatingCategory] = useState(false);

    // Edit Subcategory (Tag) Modal state
    const [editTagModalVisible, setEditTagModalVisible] = useState(false);
    const [selectedTag, setSelectedTag] = useState<any | null>(null);
    const [editTagName, setEditTagName] = useState('');
    const [updatingTag, setUpdatingTag] = useState(false);

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
                        is_active: true
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
                    icon: editCategoryIcon.trim() || 'tool'
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
        const query = searchQuery.toLowerCase();
        if (!query) return categoriesList;
        return categoriesList.filter(c =>
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
                                            className={`w-[48%] p-4 rounded-3xl border relative ${cardBgClass}`}
                                            style={shadowSm}
                                        >
                                            {/* Card Top Row with Icon Frame & Settings Dropdown Toggle */}
                                            <View className="flex-row justify-between items-center mb-3.5">
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedCategory(cat);
                                                        setTagsModalVisible(true);
                                                    }}
                                                    className={`w-10 h-10 rounded-2xl items-center justify-center border ${
                                                        isActive 
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
                                                        className="flex-row items-center px-3 py-2.5 gap-2 active:bg-slate-100 dark:active:bg-slate-850 rounded-xl"
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
                                                            setEditCategoryModalVisible(true);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="flex-row items-center px-3 py-2.5 gap-2 border-t border-slate-100 dark:border-slate-850 active:bg-slate-100 dark:active:bg-slate-850 rounded-xl"
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
                                                        className="flex-row items-center px-3 py-2.5 gap-2 border-t border-slate-100 dark:border-slate-850 active:bg-slate-100 dark:active:bg-slate-850 rounded-xl"
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
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'
                                        }`}
                                />
                            </View>

                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Feather Icon Identifier</Text>
                                <TextInput
                                    value={newCategoryIcon}
                                    onChangeText={setNewCategoryIcon}
                                    placeholder="e.g. tool, scissors, brush, home, tv, camera..."
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'
                                        }`}
                                />
                                <Text className="text-[10px] text-slate-400 mt-1 ml-1 font-medium">Use any name from the Feather vector library.</Text>
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
                                        className={`flex-1 px-4 py-3 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-50 text-slate-800 border-slate-200'
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
                                                <Feather name="tag" size={32} color="#64748B" className="opacity-50" />
                                                <Text className="text-xs text-slate-450 font-semibold italic mt-2">No specialty tags defined yet.</Text>
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
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-550/5 text-slate-800 border-slate-200'
                                        }`}
                                />
                            </View>

                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Feather Icon Identifier</Text>
                                <TextInput
                                    value={editCategoryIcon}
                                    onChangeText={setEditCategoryIcon}
                                    placeholder="e.g. tool, scissors, brush, home, tv, camera..."
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-955 text-slate-100 border-slate-850' : 'bg-slate-550/5 text-slate-800 border-slate-200'
                                        }`}
                                />
                                <Text className="text-[10px] text-slate-400 mt-1 ml-1 font-medium">Use any name from the Feather vector library.</Text>
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
                                    className={`px-4 py-3.5 text-sm font-semibold rounded-2xl border ${isDark ? 'bg-slate-950 text-slate-100 border-slate-850' : 'bg-slate-550/5 text-slate-800 border-slate-200'
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
        </View>
    );
}
