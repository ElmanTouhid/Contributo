import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Course, AcademicResource, UserFavoriteItem, UserHistoryItem, ResourceType } from '../types';
import { INITIAL_COURSES, INITIAL_FAVORITES, INITIAL_HISTORY } from '../data/initialData';
import { useAuth } from './AuthContext';
import { validateYoutubeResourceUrl } from '../utils/security';

export interface SearchResultItem {
  type: 'course' | 'resource';
  course: Course;
  resource?: AcademicResource;
  hierarchyText: string;
}

interface ResourceContextType {
  courses: Course[];
  activeCourseId: string | null;
  setActiveCourseId: (courseId: string | null) => void;
  
  // Resource Viewer Modal
  selectedResource: AcademicResource | null;
  openResourceModal: (resource: AcademicResource) => void;
  closeResourceModal: () => void;
  
  // User Personal Data (strictly scoped to logged-in student)
  favorites: UserFavoriteItem[];
  history: UserHistoryItem[];
  toggleFavorite: (resourceId: string) => void;
  isFavorite: (resourceId: string) => boolean;
  addToHistory: (resourceId: string, completed?: boolean) => void;
  clearHistory: () => void;
  removeFromFavorites: (resourceId: string) => void;
  markCompleted: (resourceId: string, completed: boolean) => void;

  // Search
  searchAcademic: (query: string) => SearchResultItem[];

  // Student Sharing & Course Management
  addCourse: (courseData: Omit<Course, 'id' | 'resources'>) => Course;
  updateCourse: (courseId: string, data: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;

  addResource: (resourceData: {
    courseId: string;
    resourceType?: ResourceType;
    title: string;
    topic: string;
    description: string;
    youtubeUrl: string;
    sharedBy?: string;
    studentId?: string;
    creator?: string;
  }) => AcademicResource;
  updateResource: (resourceId: string, data: Partial<AcademicResource>) => void;
  deleteResource: (resourceId: string) => void;

  // Helpers
  getResourceById: (resourceId: string) => { resource: AcademicResource; course: Course } | null;
}

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

const STORAGE_COURSES = 'contributo_courses_v5';
const STORAGE_FAVORITES = 'contributo_favorites_v5';
const STORAGE_HISTORY = 'contributo_history_v5';

export const ResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      // Purge old storage versions
      localStorage.removeItem('contributo_courses_v1');
      localStorage.removeItem('contributo_courses_v2');
      localStorage.removeItem('contributo_courses_v3');
      localStorage.removeItem('contributo_courses_v4');

      const saved = localStorage.getItem(STORAGE_COURSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure exact 8 official courses are present and no GEED or old demo courses remain
        const requiredCodes = [
          'CHEM-2301',
          'CSE-2321',
          'CSE-2322',
          'CSE-2323',
          'CSE-2324',
          'CSE-2340',
          'MATH-2307',
          'STAT-2311'
        ];
        const hasGeed = parsed.some((c: Course) => c.code === 'GEED-2302');
        const hasAllRequired = requiredCodes.every(code => parsed.some((c: Course) => c.code === code));
        const hasOldDemos = parsed.some((c: Course) => c.name === 'Database' || c.code === 'CSE-2321 — Data Structure');
        if (!hasGeed && hasAllRequired && !hasOldDemos && Array.isArray(parsed) && parsed.length === 8) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_COURSES;
  });

  const [allFavorites, setAllFavorites] = useState<UserFavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVORITES);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_FAVORITES;
  });

  const [allHistory, setAllHistory] = useState<UserHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_HISTORY;
  });

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<AcademicResource | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COURSES, JSON.stringify(courses));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [courses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(allFavorites));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [allFavorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(allHistory));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [allHistory]);

  // Scoped favorites strictly for the logged-in student
  const studentFavorites = useMemo(() => {
    if (!currentUser) return [];
    return allFavorites.filter(fav => fav.studentId === currentUser.universityId);
  }, [allFavorites, currentUser]);

  // Scoped history strictly for the logged-in student
  const studentHistory = useMemo(() => {
    if (!currentUser) return [];
    return allHistory.filter(h => h.studentId === currentUser.universityId);
  }, [allHistory, currentUser]);

  const isFavorite = (resourceId: string): boolean => {
    if (!currentUser) return false;
    return studentFavorites.some(f => f.resourceId === resourceId);
  };

  const toggleFavorite = (resourceId: string) => {
    if (!currentUser) return;
    const exists = allFavorites.find(
      f => f.studentId === currentUser.universityId && f.resourceId === resourceId
    );

    if (exists) {
      setAllFavorites(prev => prev.filter(f => f.id !== exists.id));
    } else {
      const newFav: UserFavoriteItem = {
        id: `fav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentId: currentUser.universityId,
        resourceId,
        addedAt: new Date().toISOString()
      };
      setAllFavorites(prev => [newFav, ...prev]);
    }
  };

  const removeFromFavorites = (resourceId: string) => {
    if (!currentUser) return;
    setAllFavorites(prev => prev.filter(
      f => !(f.studentId === currentUser.universityId && f.resourceId === resourceId)
    ));
  };

  const addToHistory = (resourceId: string, completed = false) => {
    if (!currentUser) return;
    setAllHistory(prev => {
      const filtered = prev.filter(
        h => !(h.studentId === currentUser.universityId && h.resourceId === resourceId)
      );
      const newItem: UserHistoryItem = {
        id: `hist_${Date.now()}`,
        studentId: currentUser.universityId,
        resourceId,
        watchedAt: new Date().toISOString(),
        completed
      };
      return [newItem, ...filtered];
    });
  };

  const markCompleted = (resourceId: string, completed: boolean) => {
    if (!currentUser) return;
    setAllHistory(prev => {
      const existingIndex = prev.findIndex(
        h => h.studentId === currentUser.universityId && h.resourceId === resourceId
      );
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = { ...copy[existingIndex], completed };
        return copy;
      } else {
        const newItem: UserHistoryItem = {
          id: `hist_${Date.now()}`,
          studentId: currentUser.universityId,
          resourceId,
          watchedAt: new Date().toISOString(),
          completed
        };
        return [newItem, ...prev];
      }
    });
  };

  const clearHistory = () => {
    if (!currentUser) return;
    setAllHistory(prev => prev.filter(h => h.studentId !== currentUser.universityId));
  };

  const openResourceModal = (resource: AcademicResource) => {
    setSelectedResource(resource);
    addToHistory(resource.id, false);
  };

  const closeResourceModal = () => {
    setSelectedResource(null);
  };

  const getResourceById = (resourceId: string) => {
    for (const course of courses) {
      const res = (course.resources || []).find(r => r.id === resourceId);
      if (res) {
        return { resource: res, course };
      }
    }
    return null;
  };

  // Global search across courses and resources
  const searchAcademic = (query: string): SearchResultItem[] => {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    courses.forEach(course => {
      const courseMatch = 
        course.code.toLowerCase().includes(q) ||
        course.name.toLowerCase().includes(q) ||
        course.department.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q);

      if (courseMatch) {
        results.push({
          type: 'course',
          course,
          hierarchyText: `${course.code} — ${course.name}`
        });
      }

      (course.resources || []).forEach(res => {
        const resMatch = 
          res.title.toLowerCase().includes(q) ||
          res.topic.toLowerCase().includes(q) ||
          res.description.toLowerCase().includes(q) ||
          (res.sharedBy && res.sharedBy.toLowerCase().includes(q)) ||
          (res.creator && res.creator.toLowerCase().includes(q));

        if (resMatch) {
          results.push({
            type: 'resource',
            course,
            resource: res,
            hierarchyText: `${course.code} → ${res.title}`
          });
        }
      });
    });

    return results;
  };

  // COURSE & RESOURCE OPERATIONS
  const addCourse = (courseData: Omit<Course, 'id' | 'resources'>): Course => {
    const newCourse: Course = {
      ...courseData,
      id: `course_${Date.now()}`,
      resources: []
    };
    setCourses(prev => [newCourse, ...prev]);
    return newCourse;
  };

  const updateCourse = (courseId: string, data: Partial<Course>) => {
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...data } : c));
  };

  const deleteCourse = (courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    if (activeCourseId === courseId) setActiveCourseId(null);
  };

  const addResource = (resourceData: {
    courseId: string;
    resourceType?: ResourceType;
    title: string;
    topic: string;
    description: string;
    youtubeUrl: string;
    sharedBy?: string;
    studentId?: string;
    creator?: string;
  }): AcademicResource => {
    const { detectedType, videoId, playlistId } = validateYoutubeResourceUrl(resourceData.youtubeUrl);
    const resolvedType: ResourceType = resourceData.resourceType || detectedType || 'video';
    const submitterName = resourceData.sharedBy || currentUser?.name || 'Contributo Student';
    const submitterId = resourceData.studentId || currentUser?.universityId;

    const newRes: AcademicResource = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      courseId: resourceData.courseId,
      resourceType: resolvedType,
      title: resourceData.title.trim(),
      topic: resourceData.topic.trim(),
      description: resourceData.description.trim(),
      youtubeUrl: resourceData.youtubeUrl.trim(),
      sharedBy: submitterName,
      studentId: submitterId,
      creator: resourceData.creator?.trim(),
      youtubeVideoId: videoId,
      playlistId: playlistId,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    setCourses(prev => prev.map(c => {
      if (c.id === resourceData.courseId) {
        return {
          ...c,
          resources: [newRes, ...(c.resources || [])]
        };
      }
      return c;
    }));

    return newRes;
  };

  const updateResource = (resourceId: string, data: Partial<AcademicResource>) => {
    setCourses(prev => prev.map(c => ({
      ...c,
      resources: (c.resources || []).map(r => r.id === resourceId ? { ...r, ...data } : r)
    })));
  };

  const deleteResource = (resourceId: string) => {
    setCourses(prev => prev.map(c => ({
      ...c,
      resources: (c.resources || []).filter(r => r.id !== resourceId)
    })));
  };

  return (
    <ResourceContext.Provider
      value={{
        courses,
        activeCourseId,
        setActiveCourseId,
        selectedResource,
        openResourceModal,
        closeResourceModal,
        favorites: studentFavorites,
        history: studentHistory,
        toggleFavorite,
        isFavorite,
        addToHistory,
        clearHistory,
        removeFromFavorites,
        markCompleted,
        searchAcademic,
        addCourse,
        updateCourse,
        deleteCourse,
        addResource,
        updateResource,
        deleteResource,
        getResourceById
      }}
    >
      {children}
    </ResourceContext.Provider>
  );
};

export const useResources = () => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourceProvider');
  }
  return context;
};
