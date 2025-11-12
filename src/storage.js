const STORAGE_KEY = "wellesley_degree_tracker";
const isBrowser = typeof window !== "undefined";

export const saveToLocalStorage = (data) => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save to localStorage:", error);
  }
};

export const loadFromLocalStorage = () => {
  if (!isBrowser) return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Failed to load from localStorage:", error);
    return null;
  }
};
