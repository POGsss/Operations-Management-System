import { create } from 'zustand'

const useDataStore = create((set) => ({
    isOpen: false,
    setIsOpen: (value) => set({ isOpen: value }),
}))

export default useDataStore;
