// Advanced Storage Manager with Multiple Backends
class StorageManager {
    constructor() {
        this.backends = [];
        this.currentBackend = null;
        this.init();
    }

    async init() {
        // Initialize available storage backends in order of preference
        await this.initializeBackends();
    }

    async initializeBackends() {
        // Request persistent storage to prevent browser from clearing data
        await this.requestPersistentStorage();

        // 1. IndexedDB (Primary - up to 50% of disk space)
        if (this.supportsIndexedDB()) {
            const indexedDBBackend = new IndexedDBBackend();
            await indexedDBBackend.init();
            this.backends.push(indexedDBBackend);
        }

        // 2. LocalStorage (Fallback for metadata)
        if (this.supportsLocalStorage()) {
            const localStorageBackend = new LocalStorageBackend();
            await localStorageBackend.init();
            this.backends.push(localStorageBackend);
        }

        // Set the primary backend
        this.currentBackend = this.backends[0];

        // Log available storage
        const quota = await this.checkStorageQuota();
        if (quota) {
            console.log(`Storage initialized: ${this.formatFileSize(quota.available)} available of ${this.formatFileSize(quota.quota)} total`);
        }
    }

    async requestPersistentStorage() {
        // Request persistent storage to prevent data eviction
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const isPersisted = await navigator.storage.persist();
                if (isPersisted) {
                    console.log('Persistent storage granted - data will not be automatically cleared');
                } else {
                    console.log('Persistent storage denied - data may be cleared under storage pressure');
                }
            } catch (error) {
                console.error('Error requesting persistent storage:', error);
            }
        }
    }

    supportsIndexedDB() {
        return 'indexedDB' in window;
    }

    supportsLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }

    async storeFile(username, file, category, metadata = {}) {
        // Compress file if it's an image to save storage space
        let processedFile = file;
        if (file.type.startsWith('image/') && file.size > 500 * 1024) { // Compress images > 500KB
            try {
                processedFile = await this.compressImage(file);
                console.log(`Compressed ${file.name}: ${this.formatFileSize(file.size)} -> ${this.formatFileSize(processedFile.size)} (${((1 - processedFile.size/file.size) * 100).toFixed(1)}% reduction)`);
            } catch (error) {
                console.warn('Image compression failed, storing original:', error);
                processedFile = file;
            }
        }

        // Determine storage directory based on category
        const directory = this.determineDirectory(category, metadata);

        // Choose the best backend based on file size
        const backend = this.selectBackendForFile(processedFile);
        return await backend.storeFile(username, processedFile, category, {
            ...metadata,
            originalSize: file.size,
            compressed: processedFile !== file,
            directory: directory
        });
    }

    determineDirectory(category, metadata = {}) {
        // Directory-based organization for JSON files
        if (category.includes('JSON')) {
            if (metadata.jsonFormat === 'sql') {
                return '/json-sql/';
            } else if (metadata.jsonFormat === 'nosql') {
                return '/json-nosql/';
            } else {
                return '/json/';
            }
        }

        // Media files
        if (category.includes('MEDIA')) {
            if (category.includes('IMAGE')) return '/media/images/';
            if (category.includes('VIDEO')) return '/media/videos/';
            if (category.includes('AUDIO')) return '/media/audio/';
            return '/media/';
        }

        // Default
        return '/files/';
    }

    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                // Calculate new dimensions (max 1920x1080 for large images)
                let width = img.width;
                let height = img.height;
                const maxWidth = 1920;
                const maxHeight = 1080;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob with quality compression
                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size < file.size) {
                            // Create a new File object with the same name
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        } else {
                            // If compressed size is larger, use original
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    0.85 // 85% quality
                );
            };

            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = URL.createObjectURL(file);
        });
    }

    selectBackendForFile(file) {
        // Always prefer IndexedDB (backends[0]) if available, as it has much higher capacity (200GB)
        // LocalStorage is only used as a fallback if IndexedDB is not available
        if (this.backends[0]) {
            return this.backends[0]; // IndexedDB - 200GB capacity
        }

        // Fallback to LocalStorage only if IndexedDB is unavailable
        if (this.backends[1] && file.size < 5 * 1024 * 1024) { // Only files < 5MB
            return this.backends[1]; // LocalStorage - 10MB total capacity
        }

        // If no suitable backend, return the first available
        return this.backends[0] || this.backends[1];
    }

    async getUserFiles(username) {
        // Aggregate files from all backends and remove duplicates
        const allFiles = [];
        const seenFileIds = new Set();

        for (const backend of this.backends) {
            try {
                const files = await backend.getUserFiles(username);
                for (const file of files) {
                    // Only add files we haven't seen before
                    if (!seenFileIds.has(file.id)) {
                        seenFileIds.add(file.id);
                        allFiles.push(file);
                    }
                }
            } catch (error) {
                console.error(`Error getting files from backend:`, error);
            }
        }
        return allFiles;
    }

    async getFile(fileId) {
        // Try each backend until we find the file
        for (const backend of this.backends) {
            try {
                const file = await backend.getFile(fileId);
                if (file) return file;
            } catch (error) {
                // Continue to next backend
                continue;
            }
        }
        throw new Error('File not found in any storage backend');
    }

    async deleteFile(fileId) {
        // Try to delete from all backends
        let deleted = false;
        for (const backend of this.backends) {
            try {
                await backend.deleteFile(fileId);
                deleted = true;
            } catch (error) {
                // Continue to next backend
                continue;
            }
        }
        return deleted;
    }

    async searchFiles(username, query) {
        const files = await this.getUserFiles(username);
        const searchTerm = query.toLowerCase();
        
        return files.filter(file => 
            file.filename.toLowerCase().includes(searchTerm) ||
            file.category.toLowerCase().includes(searchTerm) ||
            (file.metadata && file.metadata.description && 
             file.metadata.description.toLowerCase().includes(searchTerm))
        );
    }

    async getStorageStats(username) {
        const files = await this.getUserFiles(username);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        const backendStats = [];
        for (const backend of this.backends) {
            try {
                const stats = await backend.getStats(username);
                backendStats.push(stats);
            } catch (error) {
                console.error(`Error getting stats from backend:`, error);
            }
        }
        
        return {
            fileCount: files.length,
            totalSize: totalSize,
            usedPercentage: Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100).toFixed(1),
            categories: [...new Set(files.map(f => f.category))],
            backends: backendStats
        };
    }

    async getBackendInfo() {
        return this.backends.map(backend => ({
            name: backend.constructor.name,
            type: backend.type,
            maxSize: backend.maxSize,
            available: true
        }));
    }

    async checkStorageQuota() {
        // Check if the Storage API is available
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage || 0,
                    quota: estimate.quota || 0,
                    percentUsed: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0,
                    available: estimate.quota - estimate.usage
                };
            } catch (error) {
                console.error('Error checking storage quota:', error);
                return null;
            }
        }
        return null;
    }

    async canStoreFile(fileSize) {
        const quotaInfo = await this.checkStorageQuota();

        // If quota info is not available, allow the storage attempt
        if (!quotaInfo) {
            console.warn('Storage quota information not available, proceeding with storage');
            return { canStore: true };
        }

        // Log quota information for debugging
        console.log('Storage Check:', {
            fileSize: this.formatFileSize(fileSize),
            available: this.formatFileSize(quotaInfo.available),
            usage: this.formatFileSize(quotaInfo.usage),
            quota: this.formatFileSize(quotaInfo.quota),
            percentUsed: quotaInfo.percentUsed + '%'
        });

        // Allow storage if there's enough space with a 10MB safety margin
        const safetyMargin = 10 * 1024 * 1024; // 10MB
        const requiredSpace = fileSize + safetyMargin;

        if (quotaInfo.available < requiredSpace) {
            return {
                canStore: false,
                reason: `Insufficient storage. File size: ${this.formatFileSize(fileSize)}, Available: ${this.formatFileSize(quotaInfo.available)}`
            };
        }

        return { canStore: true };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// IndexedDB Backend with Large Capacity
class IndexedDBBackend {
    constructor() {
        this.dbName = 'DataBhandaarDB';
        this.version = 2;
        // Set theoretical max - actual limit is browser-dependent (typically 50% of disk)
        // Chrome: ~60% of disk space, Firefox: ~50% of disk space, Safari: ~1GB unless user approves more
        this.maxSize = 200 * 1024 * 1024 * 1024; // 200GB theoretical max
        this.type = 'indexedDB';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(new Error('Failed to open IndexedDB'));
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for different file types
                if (!db.objectStoreNames.contains('files')) {
                    const store = db.createObjectStore('files', { keyPath: 'id' });
                    store.createIndex('username', 'username', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('metadata')) {
                    const store = db.createObjectStore('metadata', { keyPath: 'id' });
                    store.createIndex('username', 'username', { unique: false });
                }
            };
        });
    }

    async storeFile(username, file, category, metadata = {}) {
        if (!this.db) await this.init();

        // Convert file to ArrayBuffer BEFORE creating the transaction
        // This prevents the transaction from auto-committing while waiting for async operation
        const fileArrayBuffer = await this.fileToArrayBuffer(file);

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['files', 'metadata'], 'readwrite');

                const fileId = this.generateFileId();
                const fileData = {
                    id: fileId,
                    filename: file.name,
                    filetype: file.type,
                    size: file.size,
                    category: category,
                    uploadDate: new Date().toISOString(),
                    username: username,
                    data: fileArrayBuffer
                };

                const metadataRecord = {
                    id: fileId,
                    username: username,
                    metadata: {
                        ...metadata,
                        filename: file.name,
                        size: file.size,
                        filetype: file.type
                    },
                    category: category,
                    uploadDate: new Date().toISOString()
                };

                const fileStore = transaction.objectStore('files');
                const metadataStore = transaction.objectStore('metadata');

                const fileRequest = fileStore.add(fileData);
                const metadataRequest = metadataStore.add(metadataRecord);

                fileRequest.onsuccess = () => {
                    metadataRequest.onsuccess = () => {
                        resolve({
                            id: fileId,
                            filename: file.name,
                            filetype: file.type,
                            size: file.size,
                            category: category,
                            uploadDate: new Date().toISOString(),
                            username: username,
                            metadata: metadata,
                            storage: 'IndexedDB'
                        });
                    };
                };

                fileRequest.onerror = (event) => {
                    const error = event.target.error;
                    if (error.name === 'QuotaExceededError') {
                        reject(new Error('Storage quota exceeded. Please delete some files or try a smaller file.'));
                    } else {
                        reject(new Error('Failed to store file in IndexedDB: ' + error.message));
                    }
                };

                metadataRequest.onerror = (event) => {
                    const error = event.target.error;
                    if (error.name === 'QuotaExceededError') {
                        reject(new Error('Storage quota exceeded. Please delete some files or try a smaller file.'));
                    } else {
                        reject(new Error('Failed to store metadata in IndexedDB: ' + error.message));
                    }
                };

                transaction.onerror = (event) => {
                    const error = event.target.error;
                    if (error.name === 'QuotaExceededError') {
                        reject(new Error('Storage quota exceeded. Please delete some files or try a smaller file.'));
                    } else {
                        reject(new Error('Transaction failed: ' + error.message));
                    }
                };
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    reject(new Error('Storage quota exceeded. Please delete some files or try a smaller file.'));
                } else {
                    reject(error);
                }
            }
        });
    }

    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    async getUserFiles(username) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const index = store.index('username');
            const request = index.getAll(username);

            request.onsuccess = () => {
                const results = request.result.map(item => ({
                    id: item.id,
                    filename: item.metadata?.intelligentAnalysis?.filename || item.metadata?.filename || 'file',
                    filetype: item.metadata?.intelligentAnalysis?.mainType || item.metadata?.filetype || 'unknown',
                    size: item.metadata?.intelligentAnalysis?.size || item.metadata?.size || 0,
                    category: item.category,
                    uploadDate: item.uploadDate,
                    username: item.username,
                    metadata: item.metadata
                }));
                resolve(results);
            };
            request.onerror = () => reject(new Error('Failed to get user files from IndexedDB'));
        });
    }

    async getFile(fileId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files', 'metadata'], 'readonly');
            const fileStore = transaction.objectStore('files');
            const metadataStore = transaction.objectStore('metadata');

            const fileRequest = fileStore.get(fileId);
            const metadataRequest = metadataStore.get(fileId);

            fileRequest.onsuccess = () => {
                metadataRequest.onsuccess = () => {
                    const fileData = fileRequest.result;
                    const metadata = metadataRequest.result;

                    if (!fileData) {
                        reject(new Error('File not found in IndexedDB'));
                        return;
                    }

                    const blob = new Blob([fileData.data], { type: fileData.filetype });
                    const url = URL.createObjectURL(blob);

                    resolve({
                        ...fileData,
                        ...metadata.metadata,
                        url: url,
                        blob: blob
                    });
                };
            };

            fileRequest.onerror = () => reject(new Error('Failed to get file from IndexedDB'));
        });
    }

    async deleteFile(fileId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files', 'metadata'], 'readwrite');
            const fileStore = transaction.objectStore('files');
            const metadataStore = transaction.objectStore('metadata');

            fileStore.delete(fileId);
            metadataStore.delete(fileId);

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(new Error('Failed to delete file from IndexedDB'));
        });
    }

    async getStats(username) {
        const files = await this.getUserFiles(username);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        return {
            type: this.type,
            fileCount: files.length,
            totalSize: totalSize,
            maxSize: this.maxSize
        };
    }

    generateFileId() {
        return 'idb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Enhanced LocalStorage Backend
class LocalStorageBackend {
    constructor() {
        this.maxSize = 10 * 1024 * 1024; // 10MB total (browser limit ~5-10MB)
        this.maxFileSize = 5 * 1024 * 1024; // 5MB per file (increased from 2MB)
        this.type = 'localStorage';
    }

    async init() {
        // Initialize localStorage structure
        if (!localStorage.getItem('data_bhandaar_files')) {
            localStorage.setItem('data_bhandaar_files', JSON.stringify({}));
        }
        if (!localStorage.getItem('data_bhandaar_file_index')) {
            localStorage.setItem('data_bhandaar_file_index', JSON.stringify({}));
        }
        return true;
    }

    async storeFile(username, file, category, metadata = {}) {
        if (file.size > this.maxFileSize) {
            throw new Error(`File too large for localStorage. Max: ${this.formatFileSize(this.maxFileSize)}`);
        }

        try {
            const fileId = this.generateFileId();
            const fileData = {
                id: fileId,
                filename: file.name,
                filetype: file.type,
                size: file.size,
                category: category,
                uploadDate: new Date().toISOString(),
                username: username,
                metadata: {
                    ...metadata,
                    filename: file.name,
                    size: file.size,
                    filetype: file.type
                },
                data: await this.fileToBase64(file)
            };

            this.saveToLocalStorage(fileId, fileData, username);
            return {
                ...fileData,
                storage: 'LocalStorage'
            };
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                throw new Error('Storage quota exceeded. Please delete some files or try a smaller file.');
            }
            throw error;
        }
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    saveToLocalStorage(fileId, fileData, username) {
        try {
            const files = JSON.parse(localStorage.getItem('data_bhandaar_files') || '{}');
            const index = JSON.parse(localStorage.getItem('data_bhandaar_file_index') || '{}');

            if (!files[username]) {
                files[username] = [];
            }

            files[username].push(fileData);
            index[fileId] = { username: username, backend: 'localStorage' };

            localStorage.setItem('data_bhandaar_files', JSON.stringify(files));
            localStorage.setItem('data_bhandaar_file_index', JSON.stringify(index));
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                throw new Error('Storage quota exceeded. Please delete some files or try a smaller file.');
            }
            throw error;
        }
    }

    async getUserFiles(username) {
        const files = JSON.parse(localStorage.getItem('data_bhandaar_files') || '{}');
        const userFiles = files[username] || [];
        
        // Ensure all files have proper filename, filetype, and size
        return userFiles.map(file => ({
            id: file.id,
            filename: file.metadata?.intelligentAnalysis?.filename || file.metadata?.filename || file.filename || 'file',
            filetype: file.metadata?.intelligentAnalysis?.mainType || file.metadata?.filetype || file.filetype || 'unknown',
            size: file.metadata?.intelligentAnalysis?.size || file.metadata?.size || file.size || 0,
            category: file.category,
            uploadDate: file.uploadDate,
            username: file.username,
            metadata: file.metadata
        }));
    }

    async getFile(fileId) {
        const files = JSON.parse(localStorage.getItem('data_bhandaar_files') || '{}');
        const index = JSON.parse(localStorage.getItem('data_bhandaar_file_index') || '{}');
        
        const fileInfo = index[fileId];
        if (!fileInfo || fileInfo.backend !== 'localStorage') {
            throw new Error('File not found in localStorage');
        }

        const userFiles = files[fileInfo.username];
        const fileData = userFiles.find(f => f.id === fileId);
        
        if (!fileData) {
            throw new Error('File not found in localStorage');
        }

        // Convert base64 back to blob
        const response = await fetch(fileData.data);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        return {
            ...fileData,
            url: url,
            blob: blob
        };
    }

    async deleteFile(fileId) {
        const files = JSON.parse(localStorage.getItem('data_bhandaar_files') || '{}');
        const index = JSON.parse(localStorage.getItem('data_bhandaar_file_index') || '{}');
        
        const fileInfo = index[fileId];
        if (!fileInfo || fileInfo.backend !== 'localStorage') {
            throw new Error('File not found in localStorage');
        }

        // Remove from files array
        if (files[fileInfo.username]) {
            files[fileInfo.username] = files[fileInfo.username].filter(f => f.id !== fileId);
        }

        // Remove from index
        delete index[fileId];

        // Update storage
        localStorage.setItem('data_bhandaar_files', JSON.stringify(files));
        localStorage.setItem('data_bhandaar_file_index', JSON.stringify(index));
        
        return true;
    }

    async getStats(username) {
        const files = await this.getUserFiles(username);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        return {
            type: this.type,
            fileCount: files.length,
            totalSize: totalSize,
            maxSize: this.maxSize
        };
    }

    generateFileId() {
        return 'ls_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}