// Extend LLMRegexPatterns from storage.js with additional patterns
LLMRegexPatterns.jsonAnalysis = {
    sql: [
        /"id"\s*:\s*\d+,?/,  // Numeric IDs
        /"user_id"\s*:\s*\d+,?/,  // Foreign keys
        /"created_at"\s*:\s*"[^"]*",?/,  // Timestamps
        /"updated_at"\s*:\s*"[^"]*",?/,  // Timestamps
        /"status"\s*:\s*"\w{1,20}",?/,  // Status fields
        /"email"\s*:\s*"[^@]+@[^@]+\.[^@]+",?/,  // Email patterns
        /"phone"\s*:\s*"[\d\s\-\(\)]+",?/  // Phone patterns
    ],
    nosql: [
        /"tags"\s*:\s*\[.*?\],?/,  // Arrays
        /"metadata"\s*:\s*\{.*?\},?/,  // Nested objects
        /"attributes"\s*:\s*\{.*?\},?/,  // Flexible attributes
        /"history"\s*:\s*\[.*?\],?/,  // History arrays
        /"content"\s*:\s*".{50,}",?/,  // Large text content
        /"geo"\s*:\s*\{.*?\},?/,  // Geo data
        /"social"\s*:\s*\{.*?\},?/  // Social data
    ]
};

LLMRegexPatterns.contentCategories = {
    user_data: /(user|profile|account|customer|client)/i,
    product_data: /(product|item|inventory|stock|price)/i,
    transaction_data: /(order|transaction|payment|invoice|bill)/i,
    analytics_data: /(analytics|stats|metrics|report|dashboard)/i,
    config_data: /(config|settings|preferences|options)/i
};

// Enhanced Data Processor with Intelligent Detection
class IntelligentDataProcessor {
    constructor() {
        this.userSession = null;
        this.userStorage = null;
        this.storageSystem = null;
        this.jsonConverter = new JSONConverter();
    }

    async init() {
        console.log('Initializing Data Processor...');
        
        // Check authentication first
        this.userSession = AuthSystem.checkAuth();
        if (!this.userSession) {
            console.log('No user session found');
            return;
        }

        console.log('User session found:', this.userSession.username);

        await this.initStorageSystem();
        this.initUserStorage();
        await this.loadStoredFiles();
        await this.updateStorageStats();
        await this.updateBackendInfo();
        
        console.log('Data Processor initialized successfully');
    }

    async initStorageSystem() {
        if (!this.storageSystem) {
            console.log('Initializing storage system...');
            await authSystem.initStorageSystem();
            this.storageSystem = authSystem.getStorageSystem();
        }
        return this.storageSystem;
    }

    initUserStorage() {
        const userKey = `data_bhandaar_${this.userSession.username}`;
        this.userStorage = {
            get: (key) => {
                const data = localStorage.getItem(`${userKey}_${key}`);
                return data ? JSON.parse(data) : null;
            },
            set: (key, value) => {
                localStorage.setItem(`${userKey}_${key}`, JSON.stringify(value));
            },
            remove: (key) => {
                localStorage.removeItem(`${userKey}_${key}`);
            }
        };
    }

    // Intelligent file type detection
    detectFileType(file) {
        // First check MIME type
        for (const [type, pattern] of Object.entries(LLMRegexPatterns.mediaTypes)) {
            if (pattern.test(file.type)) {
                return {
                    mainType: 'media',
                    subType: type,
                    confidence: 95,
                    filename: file.name,
                    size: file.size
                };
            }
        }

        // Check for JSON files
        if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
            return {
                mainType: 'json',
                subType: 'unknown',
                confidence: 90,
                filename: file.name,
                size: file.size
            };
        }

        // Fallback to extension analysis
        const extension = file.name.split('.').pop().toLowerCase();
        const extensionMap = {
            // Database files
            'sql': { mainType: 'database', subType: 'sql', confidence: 90 },
            'db': { mainType: 'database', subType: 'sqlite', confidence: 85 },
            'sqlite': { mainType: 'database', subType: 'sqlite', confidence: 90 },
            'sqlite3': { mainType: 'database', subType: 'sqlite', confidence: 90 },

            // JSON files
            'json': { mainType: 'json', subType: 'unknown', confidence: 85 },

            // Images
            'jpg': { mainType: 'media', subType: 'image', confidence: 80 },
            'jpeg': { mainType: 'media', subType: 'image', confidence: 80 },
            'png': { mainType: 'media', subType: 'image', confidence: 80 },
            'gif': { mainType: 'media', subType: 'image', confidence: 80 },
            'webp': { mainType: 'media', subType: 'image', confidence: 80 },
            'bmp': { mainType: 'media', subType: 'image', confidence: 80 },

            // Videos
            'mp4': { mainType: 'media', subType: 'video', confidence: 80 },
            'avi': { mainType: 'media', subType: 'video', confidence: 80 },
            'mov': { mainType: 'media', subType: 'video', confidence: 80 },
            'mkv': { mainType: 'media', subType: 'video', confidence: 80 },

            // Audio
            'mp3': { mainType: 'media', subType: 'audio', confidence: 80 },
            'wav': { mainType: 'media', subType: 'audio', confidence: 80 },
            'ogg': { mainType: 'media', subType: 'audio', confidence: 80 },
            'flac': { mainType: 'media', subType: 'audio', confidence: 80 },

            // Documents
            'pdf': { mainType: 'document', subType: 'pdf', confidence: 80 },
            'txt': { mainType: 'document', subType: 'text', confidence: 80 },
            'csv': { mainType: 'document', subType: 'csv', confidence: 80 },
            'doc': { mainType: 'document', subType: 'word', confidence: 75 },
            'docx': { mainType: 'document', subType: 'word', confidence: 75 },

            // Archives
            'zip': { mainType: 'archive', subType: 'zip', confidence: 80 },
            'rar': { mainType: 'archive', subType: 'rar', confidence: 80 },
            'tar': { mainType: 'archive', subType: 'tar', confidence: 80 },
            'gz': { mainType: 'archive', subType: 'gzip', confidence: 80 }
        };

        return extensionMap[extension] || { 
            mainType: 'unknown', 
            subType: 'unknown', 
            confidence: 50,
            filename: file.name,
            size: file.size
        };
    }

    // Enhanced JSON content analysis with intelligent structure detection
    async analyzeJsonContent(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const jsonData = JSON.parse(content);

                    // Use the new structure analyzer for comprehensive analysis
                    const structureAnalysis = this.jsonConverter.analyzeStructure(jsonData);

                    let sqlScore = 0;
                    let nosqlScore = 0;
                    const jsonString = JSON.stringify(jsonData);

                    // Analyze for SQL patterns
                    LLMRegexPatterns.jsonAnalysis.sql.forEach(pattern => {
                        const matches = jsonString.match(pattern);
                        if (matches) sqlScore += matches.length;
                    });

                    // Analyze for NoSQL patterns
                    LLMRegexPatterns.jsonAnalysis.nosql.forEach(pattern => {
                        const matches = jsonString.match(pattern);
                        if (matches) nosqlScore += matches.length;
                    });

                    // Determine JSON subtype based on structure analysis and pattern matching
                    let subType = 'generic';
                    if (structureAnalysis.recommendation === 'sql' || (sqlScore > nosqlScore && sqlScore > 0)) {
                        subType = 'sql';
                    } else if (structureAnalysis.recommendation === 'nosql' || (nosqlScore > sqlScore && nosqlScore > 0)) {
                        subType = 'nosql';
                    } else if (structureAnalysis.recommendation === 'both') {
                        subType = 'relational'; // Complex structure suitable for both
                    }

                    // Content-based categorization
                    let contentCategory = 'general';
                    for (const [category, pattern] of Object.entries(LLMRegexPatterns.contentCategories)) {
                        if (pattern.test(jsonString)) {
                            contentCategory = category;
                            break;
                        }
                    }

                    resolve({
                        subType,
                        contentCategory,
                        sqlScore,
                        nosqlScore,
                        size: jsonString.length,
                        keyCount: Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length,
                        isArray: Array.isArray(jsonData),
                        sampleKeys: Array.isArray(jsonData) && jsonData.length > 0
                            ? Object.keys(jsonData[0] || {}).slice(0, 5)
                            : Object.keys(jsonData).slice(0, 5),
                        // Include structure analysis details
                        structureAnalysis: structureAnalysis,
                        complexity: structureAnalysis.complexity,
                        depth: structureAnalysis.depth,
                        recommendation: structureAnalysis.recommendation
                    });

                } catch (error) {
                    resolve({
                        subType: 'invalid',
                        contentCategory: 'invalid',
                        error: error.message,
                        sqlScore: 0,
                        nosqlScore: 0
                    });
                }
            };

            reader.onerror = () => resolve({
                subType: 'error',
                contentCategory: 'error',
                error: 'Failed to read file',
                sqlScore: 0,
                nosqlScore: 0
            });

            reader.readAsText(file);
        });
    }

    // Enhanced media analysis
    async analyzeMediaContent(file, fileType) {
        return new Promise((resolve) => {
            const analysis = {
                subType: fileType.subType,
                size: file.size,
                dimensions: null,
                duration: null
            };

            if (fileType.subType === 'image') {
                const img = new Image();
                img.onload = function() {
                    analysis.dimensions = {
                        width: this.width,
                        height: this.height,
                        aspectRatio: (this.width / this.height).toFixed(2)
                    };
                    resolve(analysis);
                };
                img.onerror = () => resolve(analysis);
                img.src = URL.createObjectURL(file);
            } else if (fileType.subType === 'audio' || fileType.subType === 'video') {
                const media = document.createElement(fileType.subType);
                media.onloadedmetadata = function() {
                    analysis.duration = media.duration;
                    if (fileType.subType === 'video') {
                        analysis.dimensions = {
                            width: media.videoWidth,
                            height: media.videoHeight
                        };
                    }
                    resolve(analysis);
                };
                media.onerror = () => resolve(analysis);
                media.src = URL.createObjectURL(file);
            } else {
                resolve(analysis);
            }
        });
    }

    // Main analysis function
    async analyzeFile(file) {
        const fileType = this.detectFileType(file);
        let detailedAnalysis = {};

        if (fileType.mainType === 'json') {
            detailedAnalysis = await this.analyzeJsonContent(file);
        } else if (fileType.mainType === 'media') {
            detailedAnalysis = await this.analyzeMediaContent(file, fileType);
        }

        return {
            ...fileType,
            ...detailedAnalysis,
            filename: file.name,
            size: file.size,
            lastModified: file.lastModified
        };
    }

    // Store file with intelligent categorization
    async storeFile(file, metadata = {}) {
        const analysis = await this.analyzeFile(file);

        const category = this.generateCategory(analysis);
        const storedFile = await this.storageSystem.storeFile(
            this.userSession.username,
            file,
            category,
            {
                ...metadata,
                intelligentAnalysis: analysis,
                uploadedAt: new Date().toISOString()
            }
        );

        return storedFile;
    }

    // Process JSON file with conversions
    async processJsonFile(file, options = {}) {
        const { convertToSQL = false, convertToNoSQL = false, storeSeparately = true } = options;

        // Read and parse JSON
        const jsonData = await this.readJsonFile(file);

        // Analyze JSON structure for intelligent processing
        const structureAnalysis = this.jsonConverter.analyzeStructure(jsonData);
        console.log('JSON Structure Analysis:', structureAnalysis);

        const results = {
            original: null,
            sql: null,
            nosql: null,
            analysis: structureAnalysis
        };

        const relatedFileIds = [];

        // Store original JSON with structure analysis
        if (storeSeparately) {
            results.original = await this.storeFile(file, {
                jsonFormat: 'original',
                description: 'Original JSON file',
                structureAnalysis: structureAnalysis,
                conversionType: null
            });
            console.log('Stored original JSON:', results.original.id);
        }

        // Convert to SQL format
        if (convertToSQL) {
            const sqlStructure = this.jsonConverter.convertToSQL(jsonData, this.getTableName(file.name));
            const sqlContent = {
                schema: this.jsonConverter.generateSQLSchema(sqlStructure),
                inserts: this.jsonConverter.generateSQLInserts(sqlStructure),
                structure: sqlStructure,
                metadata: {
                    originalFile: file.name,
                    conversionDate: new Date().toISOString(),
                    structureAnalysis: structureAnalysis
                }
            };

            // Create SQL file
            const sqlBlob = new Blob([JSON.stringify(sqlContent, null, 2)], { type: 'application/json' });
            const sqlFile = new File([sqlBlob], file.name.replace('.json', '-sql.json'), { type: 'application/json' });

            results.sql = await this.storageSystem.storeFile(
                this.userSession.username,
                sqlFile,
                'JSON_SQL_CONVERTED',
                {
                    jsonFormat: 'sql',
                    originalFile: file.name,
                    originalFileId: results.original ? results.original.id : null,
                    tableCount: sqlStructure.tables.length,
                    totalRows: sqlStructure.metadata.totalRows,
                    description: 'SQL-converted JSON structure',
                    conversionType: 'sql',
                    structureAnalysis: structureAnalysis
                }
            );
            relatedFileIds.push(results.sql.id);
            console.log('Stored SQL conversion:', results.sql.id);
        }

        // Convert to NoSQL format
        if (convertToNoSQL) {
            const nosqlStructure = this.jsonConverter.convertToNoSQL(jsonData, this.getCollectionName(file.name));
            const nosqlContent = {
                structure: nosqlStructure,
                collections: nosqlStructure.collections,
                metadata: {
                    originalFile: file.name,
                    conversionDate: new Date().toISOString(),
                    structureAnalysis: structureAnalysis
                }
            };

            // Create NoSQL file
            const nosqlBlob = new Blob([JSON.stringify(nosqlContent, null, 2)], { type: 'application/json' });
            const nosqlFile = new File([nosqlBlob], file.name.replace('.json', '-nosql.json'), { type: 'application/json' });

            results.nosql = await this.storageSystem.storeFile(
                this.userSession.username,
                nosqlFile,
                'JSON_NOSQL_CONVERTED',
                {
                    jsonFormat: 'nosql',
                    originalFile: file.name,
                    originalFileId: results.original ? results.original.id : null,
                    collectionCount: nosqlStructure.collections.length,
                    totalDocuments: nosqlStructure.metadata.totalDocuments,
                    description: 'NoSQL-converted JSON structure',
                    conversionType: 'nosql',
                    structureAnalysis: structureAnalysis
                }
            );
            relatedFileIds.push(results.nosql.id);
            console.log('Stored NoSQL conversion:', results.nosql.id);
        }

        // Update original file metadata with related file IDs
        if (results.original && relatedFileIds.length > 0) {
            // Note: This would require implementing an updateFileMetadata method
            console.log('Related files for', results.original.id, ':', relatedFileIds);
        }

        // Generate preview
        if (convertToSQL && convertToNoSQL) {
            const sqlStructure = this.jsonConverter.convertToSQL(jsonData, this.getTableName(file.name));
            const nosqlStructure = this.jsonConverter.convertToNoSQL(jsonData, this.getCollectionName(file.name));
            results.preview = this.jsonConverter.generatePreview(jsonData, sqlStructure, nosqlStructure);
        }

        return results;
    }

    // Read JSON file
    async readJsonFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Get table name from filename
    getTableName(filename) {
        return filename.replace('.json', '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }

    // Get collection name from filename
    getCollectionName(filename) {
        return filename.replace('.json', '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }

    generateCategory(analysis) {
        if (analysis.mainType === 'media') {
            return `MEDIA_${analysis.subType.toUpperCase()}`;
        } else if (analysis.mainType === 'json') {
            return `JSON_${analysis.subType.toUpperCase()}_${analysis.contentCategory.toUpperCase()}`;
        } else if (analysis.mainType === 'database') {
            return `DATABASE_${analysis.subType.toUpperCase()}`;
        } else if (analysis.mainType === 'document') {
            return `DOCUMENT_${analysis.subType.toUpperCase()}`;
        } else if (analysis.mainType === 'archive') {
            return `ARCHIVE_${analysis.subType.toUpperCase()}`;
        } else {
            return `UNKNOWN_${analysis.subType.toUpperCase()}`;
        }
    }

    // Get user's stored files
    async getUserFiles() {
        return await this.storageSystem.getUserFiles(this.userSession.username);
    }

    // Get storage statistics
    async getStorageStats() {
        return await this.storageSystem.getStorageStats(this.userSession.username);
    }

    // Get backend information
    async getBackendInfo() {
        return await this.storageSystem.getBackendInfo();
    }

    // Update storage stats display
    async updateStorageStats() {
        try {
            const stats = await this.getStorageStats();
            const quotaInfo = await this.storageSystem.checkStorageQuota();
            const statsElement = document.getElementById('storageStats');
            if (statsElement) {
                let storageRemaining = 'N/A';

                if (quotaInfo) {
                    // Calculate remaining storage in GB
                    storageRemaining = this.formatFileSize(quotaInfo.available);
                }

                statsElement.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">FILES_STORED:</span>
                            <span class="stat-value">${stats.fileCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">TOTAL_SIZE:</span>
                            <span class="stat-value">${this.formatFileSize(stats.totalSize)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">STORAGE_USED:</span>
                            <span class="stat-value">${stats.usedPercentage}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">STORAGE_REMAINING:</span>
                            <span class="stat-value" id="storageRemaining">${storageRemaining}</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error updating storage stats:', error);
        }
    }

    // Update backend information display
    async updateBackendInfo() {
        try {
            const backends = await this.getBackendInfo();
            const backendsList = document.getElementById('backendsList');
            if (backendsList) {
                backendsList.innerHTML = backends.map(backend => `
                    <div class="backend-item">
                        <div class="backend-info">
                            <strong>${backend.type.toUpperCase()}</strong>
                            <span class="backend-size">${this.formatFileSize(backend.maxSize)}</span>
                        </div>
                        <div class="backend-status">
                            <span class="status-indicator status-active"></span>
                            <span>ACTIVE</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error updating backend info:', error);
        }
    }

    // Search files
    async searchFiles(query) {
        return await this.storageSystem.searchFiles(this.userSession.username, query);
    }

    // Download file
    async downloadFile(fileId) {
        const fileData = await this.storageSystem.getFile(fileId);
        return fileData;
    }

    // Delete file
    async deleteFile(fileId) {
        return await this.storageSystem.deleteFile(fileId);
    }

    // Load and display stored files
    async loadStoredFiles() {
        try {
            console.log('loadStoredFiles: Fetching user files...');
            const files = await this.getUserFiles();
            console.log('loadStoredFiles: Retrieved', files.length, 'files');
            displayStoredFiles(files);
            await this.updateStorageStats();
        } catch (error) {
            console.error('Error loading stored files:', error);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// DOM Elements
let uploadArea, fileInput, uploadBtn, metadataInput, autoCategorize, intelligentAnalysis;
let analyzingStatus, categorizingStatus, storageStatus, schemaStatus;
let progressFill, progressText, resultsContainer, analysisResults;
let filesGrid, searchInput, refreshBtn;

// Application state
let isProcessing = false;
let dataProcessor = null;
let currentFiles = [];

// Initialize the application
async function init() {
    console.log('Initializing main application...');
    
    // Check if user is authenticated
    const currentUser = AuthSystem.checkAuth();
    if (!currentUser) {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    console.log('User authenticated:', currentUser);

    // Initialize DOM elements FIRST so they're available when loading files
    console.log('Initializing DOM elements...');
    initializeDOMElements();

    // Initialize storage system
    await authSystem.initStorageSystem();

    // Initialize data processor (this will load stored files)
    dataProcessor = new IntelligentDataProcessor();
    await dataProcessor.init();

    if (!dataProcessor.userSession) {
        console.error('Failed to initialize data processor - userSession is null');
        console.log('Attempting to continue with basic functionality...');
        // Continue anyway to allow basic upload functionality
    }

    console.log('Setting up event listeners and effects...');
    setupEventListeners();
    addCyberEffects();
    addLogoutButton();

    console.log('Main application initialized successfully');
    console.log('Upload button:', document.getElementById('uploadBtn'));
    console.log('File input:', document.getElementById('fileInput'));
}

function initializeDOMElements() {
    console.log('Initializing DOM elements...');
    
    // Get all DOM elements
    uploadArea = document.getElementById('uploadArea');
    fileInput = document.getElementById('fileInput');
    uploadBtn = document.getElementById('uploadBtn');
    metadataInput = document.getElementById('metadataInput');
    autoCategorize = document.getElementById('autoCategorize');
    intelligentAnalysis = document.getElementById('intelligentAnalysis');
    analyzingStatus = document.getElementById('analyzingStatus');
    categorizingStatus = document.getElementById('categorizingStatus');
    storageStatus = document.getElementById('storageStatus');
    schemaStatus = document.getElementById('schemaStatus');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    resultsContainer = document.getElementById('resultsContainer');
    analysisResults = document.getElementById('analysisResults');
    filesGrid = document.getElementById('filesGrid');
    searchInput = document.getElementById('searchInput');
    refreshBtn = document.getElementById('refreshBtn');

    console.log('DOM elements initialized:', {
        uploadArea: !!uploadArea,
        fileInput: !!fileInput,
        uploadBtn: !!uploadBtn,
        filesGrid: !!filesGrid
    });
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // File upload event listeners
    if (uploadBtn && fileInput) {
        console.log('Setting up upload button listener');
        uploadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling to uploadArea
            console.log('Upload button clicked - triggering file input');
            fileInput.click();
        }, false);
    } else {
        console.error('Upload button or file input not found:', {
            uploadBtn: !!uploadBtn,
            fileInput: !!fileInput
        });
    }
    
    if (fileInput) {
        console.log('Setting up file input change listener');
        fileInput.addEventListener('change', function(e) {
            console.log('File input changed, files:', e.target.files.length);
            if (e.target.files.length > 0) {
                handleFileSelection(e);
            }
        });
    }
    
    // Drag and drop event listeners
    if (uploadArea) {
        console.log('Setting up drag and drop listeners');
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('drag-over');
            console.log('Drag over upload area');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');
            console.log('Drag leave upload area');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length) {
                console.log('Files dropped:', e.dataTransfer.files.length);
                processFiles(e.dataTransfer.files);
            }
        });

        // Also make the entire upload area clickable (but not the button itself)
        uploadArea.addEventListener('click', function(e) {
            // Don't trigger if clicking the upload button itself
            if (e.target.closest('#uploadBtn') || e.target.closest('.cyber-btn')) {
                return;
            }
            if (fileInput) {
                console.log('Upload area clicked (not button) - triggering file input');
                fileInput.click();
            }
        });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('Refresh button clicked');
            dataProcessor.loadStoredFiles();
        });
    }

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Add storage management event listeners
    const optimizeStorageBtn = document.getElementById('optimizeStorageBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');

    if (optimizeStorageBtn) {
        optimizeStorageBtn.addEventListener('click', optimizeStorage);
    }
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearCache);
    }
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportAllData);
    }

    console.log('Event listeners setup complete');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length) {
        console.log('Files dropped:', e.dataTransfer.files.length);
        processFiles(e.dataTransfer.files);
    }
}

function handleFileSelection(e) {
    if (e.target.files && e.target.files.length > 0) {
        console.log('Files selected:', e.target.files.length);
        console.log('File names:', Array.from(e.target.files).map(f => f.name));
        processFiles(e.target.files);
    } else {
        console.log('No files selected or event target missing files');
    }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const fileCards = filesGrid.querySelectorAll('.file-card');
    
    fileCards.forEach(card => {
        const fileName = card.querySelector('.file-name').textContent.toLowerCase();
        const fileCategory = card.querySelector('.file-category').textContent.toLowerCase();
        
        if (fileName.includes(query) || fileCategory.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Enhanced file processing
async function processFiles(files) {
    if (isProcessing) {
        console.warn('Already processing files, ignoring duplicate call');
        showNotification('SYSTEM_IS_CURRENTLY_PROCESSING_DATA_PLEASE_WAIT', 'error');
        return;
    }

    isProcessing = true;
    currentFiles = Array.from(files);
    resetStatusIndicators();
    resetProgress();
    clearResults();

    console.log('=== START: Processing files:', files.length);
    console.log('File names:', Array.from(files).map(f => f.name));
    
    try {
        // Step 1: Intelligent Analysis
        await performIntelligentAnalysis(files);
        
        // Step 2: Storage Processing
        await storeAndProcessFiles(files);
    } catch (error) {
        console.error('Error processing files:', error);
        showNotification(`PROCESSING_FAILED: ${error.message}`, 'error');
        isProcessing = false;
    }
}

async function performIntelligentAnalysis(files) {
    setStatusActive(analyzingStatus, true);
    updateProgress(25);
    
    const analysisContainer = analysisResults;
    analysisContainer.innerHTML = '';
    
    for (const file of files) {
        const analysis = await dataProcessor.analyzeFile(file);
        displayFileAnalysis(analysis, analysisContainer);
    }
    
    setStatusActive(analyzingStatus, false);
}

function displayFileAnalysis(analysis, container) {
    const analysisItem = document.createElement('div');
    analysisItem.className = 'analysis-item';
    
    let analysisHTML = `
        <div class="analysis-header">
            <strong>>_ ${analysis.filename}</strong>
        </div>
        <div class="analysis-details">
            <strong>TYPE:</strong> ${analysis.mainType.toUpperCase()}<br>
            <strong>SUB_TYPE:</strong> ${analysis.subType.toUpperCase()}<br>
            <strong>CONFIDENCE:</strong> ${analysis.confidence}%<br>
            <strong>SIZE:</strong> ${formatFileSize(analysis.size)}<br>
    `;
    
    if (analysis.mainType === 'json') {
        analysisHTML += `
            <strong>JSON_TYPE:</strong> ${analysis.subType.toUpperCase()}<br>
            <strong>CONTENT_CATEGORY:</strong> ${analysis.contentCategory}<br>
            <strong>SQL_SCORE:</strong> ${analysis.sqlScore}<br>
            <strong>NOSQL_SCORE:</strong> ${analysis.nosqlScore}<br>
            ${analysis.sampleKeys ? `<strong>SAMPLE_KEYS:</strong> ${analysis.sampleKeys.join(', ')}<br>` : ''}
        `;

        // Add structure analysis if available
        if (analysis.structureAnalysis) {
            const sa = analysis.structureAnalysis;
            analysisHTML += `
                <div style="margin-top: 10px; padding: 10px; background: rgba(0,255,255,0.1); border-left: 3px solid #00ffff;">
                    <strong>STRUCTURE_ANALYSIS:</strong><br>
                    <strong>└─ COMPLEXITY:</strong> ${sa.complexity.toUpperCase()}<br>
                    <strong>└─ DEPTH:</strong> ${sa.depth}<br>
                    <strong>└─ IS_FLAT:</strong> ${sa.isFlat ? 'YES' : 'NO'}<br>
                    <strong>└─ IS_NESTED:</strong> ${sa.isNested ? 'YES' : 'NO'}<br>
                    <strong>└─ IS_RELATIONAL:</strong> ${sa.isRelational ? 'YES' : 'NO'}<br>
                    <strong>└─ RECOMMENDATION:</strong> ${sa.recommendation.toUpperCase()}<br>
                    <strong>└─ ITEM_COUNT:</strong> ${sa.itemCount}<br>
                </div>
            `;
        }

        // Add conversion recommendation
        if (analysis.recommendation) {
            analysisHTML += `
                <div style="margin-top: 8px; padding: 8px; background: rgba(255,215,0,0.1); border-left: 3px solid #ffd700;">
                    <strong>💡 CONVERSION_RECOMMENDATION:</strong> ${analysis.recommendation.toUpperCase()}
                </div>
            `;
        }
    } else if (analysis.mainType === 'media') {
        if (analysis.dimensions) {
            analysisHTML += `<strong>DIMENSIONS:</strong> ${analysis.dimensions.width}x${analysis.dimensions.height}<br>`;
        }
        if (analysis.duration) {
            analysisHTML += `<strong>DURATION:</strong> ${analysis.duration.toFixed(2)}s<br>`;
        }
    }
    
    analysisHTML += `</div>`;
    analysisItem.innerHTML = analysisHTML;
    container.appendChild(analysisItem);
}

async function storeAndProcessFiles(files) {
    setStatusActive(categorizingStatus, true);
    updateProgress(50);

    const metadata = metadataInput?.value.trim() || '';
    const storageResults = [];

    console.log('=== STORING FILES: Starting storage for', files.length, 'files');

    // Check if any images will be compressed
    const largeImages = Array.from(files).filter(f => f.type.startsWith('image/') && f.size > 500 * 1024);
    if (largeImages.length > 0) {
        showNotification(`COMPRESSING_${largeImages.length}_LARGE_IMAGE(S)_TO_SAVE_STORAGE`, 'success');
    }

    // Check total file size
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    const canStore = await dataProcessor.storageSystem.canStoreFile(totalSize);

    if (!canStore.canStore) {
        console.error('Cannot store files:', canStore.reason);
        console.log('File sizes:', Array.from(files).map(f => `${f.name}: ${dataProcessor.formatFileSize(f.size)}`));
        console.log('Total size:', dataProcessor.formatFileSize(totalSize));

        for (const file of files) {
            storageResults.push({
                success: false,
                file: file,
                error: canStore.reason
            });
        }
        setStatusActive(categorizingStatus, false);
        setStatusActive(storageStatus, false);
        setStatusActive(schemaStatus, false);
        isProcessing = false;
        displayProcessingResults(storageResults);
        showNotification(`STORAGE_CHECK_FAILED: ${canStore.reason}`, 'error');
        return;
    }

    for (const file of files) {
        try {
            console.log('Storing file:', file.name);

            // Check if it's a JSON file and if conversion is enabled
            const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

            if (isJSON) {
                const convertToSQL = document.getElementById('convertToSQL')?.checked;
                const convertToNoSQL = document.getElementById('convertToNoSQL')?.checked;
                const storeOriginal = document.getElementById('storeOriginal')?.checked;

                if (convertToSQL || convertToNoSQL) {
                    // Process with JSON conversion
                    console.log('Processing JSON with conversion:', { convertToSQL, convertToNoSQL, storeOriginal });
                    const results = await dataProcessor.processJsonFile(file, {
                        convertToSQL,
                        convertToNoSQL,
                        storeSeparately: storeOriginal
                    });

                    // Add results for each converted format
                    if (results.original) {
                        storageResults.push({
                            success: true,
                            file: results.original
                        });
                    }
                    if (results.sql) {
                        storageResults.push({
                            success: true,
                            file: results.sql
                        });
                    }
                    if (results.nosql) {
                        storageResults.push({
                            success: true,
                            file: results.nosql
                        });
                    }

                    // Display conversion preview if available
                    if (results.preview) {
                        displayConversionPreview(results.preview);
                    }

                    console.log('JSON conversion completed:', results);
                } else {
                    // Store as regular JSON without conversion
                    const storedFile = await dataProcessor.storeFile(file, {
                        description: metadata,
                        uploadedAt: new Date().toISOString()
                    });
                    console.log('Successfully stored JSON file:', file.name, 'with ID:', storedFile.id);
                    storageResults.push({
                        success: true,
                        file: storedFile
                    });
                }
            } else {
                // Store non-JSON files normally
                const storedFile = await dataProcessor.storeFile(file, {
                    description: metadata,
                    uploadedAt: new Date().toISOString()
                });
                console.log('Successfully stored file:', file.name, 'with ID:', storedFile.id);
                storageResults.push({
                    success: true,
                    file: storedFile
                });
            }
        } catch (error) {
            console.error('Error storing file:', error);
            storageResults.push({
                success: false,
                file: file,
                error: error.message
            });
        }
    }

    console.log('=== STORED FILES: Completed storage, total results:', storageResults.length);

    setStatusActive(categorizingStatus, false);
    setStatusActive(storageStatus, true);
    updateProgress(75);

    // Final processing
    setTimeout(() => {
        setStatusActive(storageStatus, false);
        setStatusActive(schemaStatus, true);
        updateProgress(100);

        setTimeout(() => {
            setStatusActive(schemaStatus, false);
            isProcessing = false;
            displayProcessingResults(storageResults);
            dataProcessor.loadStoredFiles();
            showNotification('DATA_PROCESSING_AND_STORAGE_COMPLETE', 'success');
        }, 1000);
    }, 1000);
}

function displayProcessingResults(results) {
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        if (result.success) {
            const file = result.file;
            resultItem.innerHTML = `
                <div class="result-title">>_ SUCCESS: ${file.filename.toUpperCase()}</div>
                <div class="result-details">
                    <strong>FILE_ID:</strong> ${file.id}<br>
                    <strong>CATEGORY:</strong> ${file.category}<br>
                    <strong>STORAGE:</strong> ${file.storage}<br>
                    <strong>SIZE:</strong> ${formatFileSize(file.size)}<br>
                    <strong>UPLOAD_TIME:</strong> ${new Date(file.uploadDate).toLocaleString()}
                </div>
            `;
        } else {
            resultItem.innerHTML = `
                <div class="result-title" style="color: #ff0066;">>_ FAILED: ${result.file.name}</div>
                <div class="result-details" style="color: #ff0066;">
                    <strong>ERROR:</strong> ${result.error}
                </div>
            `;
        }
        
        resultsContainer.appendChild(resultItem);
    });
}

// Display stored files in the grid
function displayStoredFiles(files) {
    console.log('displayStoredFiles called with', files.length, 'files');

    if (!filesGrid) {
        console.error('filesGrid element not found - cannot display files');
        return;
    }

    if (files.length === 0) {
        console.log('No files to display');
        filesGrid.innerHTML = '<div class="no-files"><p>>_ NO_FILES_STORED_YET</p></div>';
        return;
    }

    console.log('Displaying', files.length, 'files in grid');
    filesGrid.innerHTML = '';

    files.forEach(file => {
        const fileCard = createFileCard(file);
        filesGrid.appendChild(fileCard);
    });

    console.log('Files displayed successfully');
}

function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-card';

    // Check if file was compressed
    const compressionInfo = file.metadata?.compressed ?
        `<span class="compression-badge" title="Original: ${formatFileSize(file.metadata.originalSize)}">📦 COMPRESSED</span>` : '';

    card.innerHTML = `
        <div class="file-icon">${getFileIcon(file.category)}</div>
        <div class="file-info">
            <div class="file-name">${file.filename} ${compressionInfo}</div>
            <div class="file-meta">
                <span class="file-category">${formatCategoryLabel(file.category)}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <span class="file-date">${new Date(file.uploadDate).toLocaleDateString()}</span>
            </div>
        </div>
        <div class="file-actions">
            <button class="action-btn download-btn" onclick="downloadFile('${file.id}')" title="Download">↓</button>
            <button class="action-btn view-btn" onclick="viewFile('${file.id}')" title="View">👁</button>
            <button class="action-btn delete-btn" onclick="deleteFile('${file.id}')" title="Delete">×</button>
        </div>
    `;
    return card;
}

// Format category label for user-friendly display
function formatCategoryLabel(category) {
    // Media files
    if (category.includes('MEDIA_IMAGE')) return 'Image';
    if (category.includes('MEDIA_VIDEO')) return 'Video';
    if (category.includes('MEDIA_AUDIO')) return 'Audio';
    if (category.includes('MEDIA_')) return 'Media';

    // JSON files
    if (category.includes('JSON_SQL')) return 'JSON (SQL Format)';
    if (category.includes('JSON_NOSQL')) return 'JSON (NoSQL Format)';
    if (category.includes('JSON_GENERIC')) return 'JSON (Generic)';
    if (category.includes('JSON_UNKNOWN')) return 'JSON';
    if (category.includes('JSON_')) return 'JSON';

    // Database files
    if (category.includes('DATABASE_SQL')) return 'SQL Database';
    if (category.includes('DATABASE_SQLITE')) return 'SQLite Database';
    if (category.includes('DATABASE_')) return 'Database';

    // Document files
    if (category.includes('DOCUMENT_PDF')) return 'PDF Document';
    if (category.includes('DOCUMENT_TEXT')) return 'Text File';
    if (category.includes('DOCUMENT_CSV')) return 'CSV File';
    if (category.includes('DOCUMENT_WORD')) return 'Word Document';
    if (category.includes('DOCUMENT_')) return 'Document';

    // Archive files
    if (category.includes('ARCHIVE_ZIP')) return 'ZIP Archive';
    if (category.includes('ARCHIVE_RAR')) return 'RAR Archive';
    if (category.includes('ARCHIVE_TAR')) return 'TAR Archive';
    if (category.includes('ARCHIVE_GZIP')) return 'GZIP Archive';
    if (category.includes('ARCHIVE_')) return 'Archive';

    // Unknown
    if (category.includes('UNKNOWN')) return 'Unknown File';

    // Fallback: Convert underscores to spaces and capitalize
    return category.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getFileIcon(category) {
    // Media icons
    if (category.includes('IMAGE')) return '🖼';
    if (category.includes('VIDEO')) return '🎬';
    if (category.includes('AUDIO')) return '🎵';

    // JSON icons
    if (category.includes('JSON')) return '📊';

    // Database icons
    if (category.includes('DATABASE')) return '🗄️';

    // Document icons
    if (category.includes('DOCUMENT_PDF')) return '📕';
    if (category.includes('DOCUMENT_TEXT')) return '📝';
    if (category.includes('DOCUMENT_CSV')) return '📈';
    if (category.includes('DOCUMENT')) return '📄';

    // Archive icons
    if (category.includes('ARCHIVE')) return '📦';

    // Default
    return '📄';
}

// File actions
async function downloadFile(fileId) {
    try {
        console.log('Downloading file:', fileId);
        const fileData = await dataProcessor.downloadFile(fileId);
        const url = fileData.url;
        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(`DOWNLOADING: ${fileData.filename}`, 'success');
    } catch (error) {
        console.error('Download error:', error);
        showNotification(`DOWNLOAD_FAILED: ${error.message}`, 'error');
    }
}

/**
 * VIEW FILE FUNCTION
 * This function handles displaying different file types when user clicks the "View" (eye) button
 * It intelligently detects the file type and shows the appropriate viewer
 */
async function viewFile(fileId) {
    try {
        // Step 1: Fetch the file data from storage using the file ID
        console.log('Viewing file:', fileId);
        const fileData = await dataProcessor.downloadFile(fileId);
        console.log('File category:', fileData.category);
        console.log('File type:', fileData.filetype);

        // Step 2: Check file type and display appropriate viewer
        // For images - show image modal with preview
        if (fileData.filetype.startsWith('image/')) {
            showImageModal(fileData);
        }
        // For videos - show video player modal
        else if (fileData.filetype.startsWith('video/')) {
            showVideoModal(fileData);
        }
        // For audio files - show audio player modal
        else if (fileData.filetype.startsWith('audio/')) {
            showAudioModal(fileData);
        }
        // For JSON files - check if it's SQL/NoSQL converted or regular JSON
        else if (fileData.filetype === 'application/json') {

            // Step 3: Detect if this is a SQL-converted file
            // We check both exact match and contains to catch all SQL variations
            if (fileData.category === 'JSON_SQL_CONVERTED' || fileData.category.includes('JSON_SQL')) {
                console.log('Detected SQL converted file, displaying SQL viewer');

                // Step 4: Extract the JSON content from the file data
                let content;
                if (fileData.fileData) {
                    // If file data is in binary format, decode it to text
                    const decoder = new TextDecoder();
                    content = decoder.decode(fileData.fileData);
                } else {
                    // If already in text format, use as-is
                    content = fileData;
                }

                // Step 5: Display the interactive SQL table viewer
                displaySQLData(content, fileData.filename);
            }
            // For NoSQL converted files, show regular JSON viewer for now
            else if (fileData.category === 'JSON_NOSQL_CONVERTED' || fileData.category.includes('JSON_NOSQL')) {
                console.log('Detected NoSQL converted file, displaying as JSON for now');
                showJsonModal(fileData);
            }
            // For regular JSON files, show standard JSON viewer
            else {
                console.log('Regular JSON file, displaying JSON viewer');
                showJsonModal(fileData);
            }
        }
        // For all other file types (PDFs, etc.) - trigger download
        else {
            downloadFile(fileId);
        }
    } catch (error) {
        // Handle any errors during file viewing
        console.error('View file error:', error);
        showNotification(`VIEW_FAILED: ${error.message}`, 'error');
    }
}

async function deleteFile(fileId) {
    if (confirm('ARE_YOU_SURE_YOU_WANT_TO_DELETE_THIS_FILE?')) {
        try {
            console.log('Deleting file:', fileId);
            await dataProcessor.deleteFile(fileId);
            showNotification('FILE_DELETED_SUCCESSFULLY', 'success');
            dataProcessor.loadStoredFiles();
        } catch (error) {
            console.error('Delete file error:', error);
            showNotification(`DELETE_FAILED: ${error.message}`, 'error');
        }
    }
}

// Modal functions
function showImageModal(fileData) {
    showMediaModal(fileData, 'img');
}

function showVideoModal(fileData) {
    showMediaModal(fileData, 'video');
}

function showAudioModal(fileData) {
    showMediaModal(fileData, 'audio');
}

function showMediaModal(fileData, mediaType) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    let mediaElement = '';
    if (mediaType === 'img') {
        mediaElement = `<img src="${fileData.url}" alt="${fileData.filename}" style="max-width: 100%; max-height: 80vh;">`;
    } else if (mediaType === 'video') {
        mediaElement = `<video controls style="max-width: 100%; max-height: 70vh;">
            <source src="${fileData.url}" type="${fileData.filetype}">
            Your browser does not support the video tag.
        </video>`;
    } else if (mediaType === 'audio') {
        mediaElement = `<audio controls style="width: 100%;">
            <source src="${fileData.url}" type="${fileData.filetype}">
            Your browser does not support the audio tag.
        </audio>`;
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>>_ ${fileData.filename}</h3>
            ${mediaElement}
            <div class="file-info">
                <p><strong>Category:</strong> ${fileData.category}</p>
                <p><strong>Size:</strong> ${formatFileSize(fileData.size)}</p>
                <p><strong>Uploaded:</strong> ${new Date(fileData.uploadDate).toLocaleString()}</p>
                ${fileData.metadata?.intelligentAnalysis ? `
                    <p><strong>Analysis:</strong> ${fileData.metadata.intelligentAnalysis.mainType} - ${fileData.metadata.intelligentAnalysis.subType}</p>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showJsonModal(fileData) {
    const modal = document.createElement('div');
    modal.className = 'modal';

    let jsonContent = 'Unable to display JSON content';
    try {
        if (fileData.fileData) {
            const decoder = new TextDecoder();
            jsonContent = JSON.stringify(JSON.parse(decoder.decode(fileData.fileData)), null, 2);
        } else {
            jsonContent = JSON.stringify(fileData, null, 2);
        }
    } catch (error) {
        jsonContent = 'Error parsing JSON: ' + error.message;
    }

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>>_ ${fileData.filename}</h3>
            <pre class="json-content">${jsonContent}</pre>
            <div class="file-info">
                <p><strong>Category:</strong> ${fileData.category}</p>
                <p><strong>Size:</strong> ${formatFileSize(fileData.size)}</p>
                <p><strong>Uploaded:</strong> ${new Date(fileData.uploadDate).toLocaleString()}</p>
                ${fileData.metadata?.intelligentAnalysis ? `
                    <p><strong>JSON Type:</strong> ${fileData.metadata.intelligentAnalysis.subType}</p>
                    <p><strong>Content Category:</strong> ${fileData.metadata.intelligentAnalysis.contentCategory}</p>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * DISPLAY SQL DATA FUNCTION
 * This is the main function for displaying SQL-converted JSON data as interactive tables
 * It creates a user-friendly interface to browse database tables, schemas, and relationships
 *
 * @param {string|object} content - The SQL data (either JSON string or object)
 * @param {string} filename - Name of the file being viewed
 */
function displaySQLData(content, filename) {
    try {
        // Step 1: Parse the SQL data from JSON format
        // If content is a string, parse it; if already an object, use as-is
        const sqlData = typeof content === 'string' ? JSON.parse(content) : content;

        // Step 2: Validate the SQL structure
        // Ensure the data has the required 'structure.tables' property
        if (!sqlData.structure || !sqlData.structure.tables) {
            throw new Error('Invalid SQL converted file structure');
        }

        // Step 3: Extract tables and relationships from the SQL structure
        const tables = sqlData.structure.tables;  // Array of database tables
        const relationships = sqlData.structure.relationships || [];  // Foreign key relationships

        // Step 4: Build the HTML structure for the SQL viewer interface
        const sqlViewerHTML = `
            <div class="sql-viewer">
                <!-- Dropdown to select which table to view -->
                <div class="table-selector">
                    <label for="tableSelect">Select Table:</label>
                    <select id="tableSelect">
                        <option value="">-- Select a table --</option>
                        ${tables.map((table, idx) =>
                            `<option value="${idx}">${table.name} (${table.rows.length} rows)</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- Section 1: Table Schema (column definitions) - Initially hidden -->
                <div class="table-schema" id="tableSchema" style="display: none;">
                    <h3>Schema for <span id="tableName"></span></h3>
                    <table id="schemaTable">
                        <thead>
                            <tr>
                                <th>Column Name</th>
                                <th>Data Type</th>
                                <th>Primary Key</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Schema rows will be populated dynamically -->
                        </tbody>
                    </table>
                </div>

                <!-- Section 2: Table Data (actual rows) - Initially hidden -->
                <div class="table-data" id="tableData" style="display: none;">
                    <h3>Data (<span id="rowCount">0</span> rows)</h3>
                    <div class="table-container">
                        <table id="dataTable">
                            <thead>
                                <!-- Column headers will be populated dynamically -->
                            </thead>
                            <tbody>
                                <!-- Data rows will be populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Section 3: Relationships (foreign keys) - Initially hidden -->
                <div class="relationships" id="relationships" style="display: none;">
                    <h3>Relationships</h3>
                    <ul id="relationshipsList">
                        <!-- Relationship items will be populated dynamically -->
                    </ul>
                </div>
            </div>
        `;

        // Step 5: Display the SQL viewer in a modal popup
        showModal(sqlViewerHTML, `SQL View: ${filename}`);

        // Step 6: Add interactivity - listen for table selection changes
        document.getElementById('tableSelect').addEventListener('change', function(e) {
            const tableIdx = e.target.value;  // Get selected table index

            if (tableIdx !== '') {
                // User selected a table - show schema, data, and relationships
                updateTableView(tables[parseInt(tableIdx)], relationships, tables[parseInt(tableIdx)].name);
            } else {
                // User deselected (went back to "-- Select a table --") - hide all sections
                document.getElementById('tableSchema').style.display = 'none';
                document.getElementById('tableData').style.display = 'none';
                document.getElementById('relationships').style.display = 'none';
            }
        });

    } catch (error) {
        // Step 7: Error handling - show user-friendly error message
        console.error('Error displaying SQL data:', error);
        showModal(`<p>Error displaying SQL data: ${error.message}</p>`, `SQL View: ${filename}`);
    }
}

/**
 * UPDATE TABLE VIEW FUNCTION
 * This function populates the SQL viewer with data for a specific table
 * It updates three sections: Schema, Data, and Relationships
 *
 * @param {object} table - The table object containing columns and rows
 * @param {array} relationships - Array of foreign key relationships
 * @param {string} tableName - Name of the table being displayed
 */
function updateTableView(table, relationships, tableName) {
    // ==================== SECTION 1: POPULATE TABLE SCHEMA ====================
    // The schema shows the structure: column names, data types, and primary keys

    // Get reference to the schema table body
    const schemaTbody = document.querySelector('#schemaTable tbody');
    schemaTbody.innerHTML = '';  // Clear any existing content

    // Loop through each column in the table
    for (const column of table.columns) {
        // Create a new table row for this column
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${column.name}</td>
            <td>${column.type}</td>
            <td>${column.primaryKey ? 'Yes' : 'No'}</td>
        `;
        // Add the row to the schema table
        schemaTbody.appendChild(row);
    }

    // ==================== SECTION 2: POPULATE TABLE DATA ====================
    // The data table shows all the actual rows and values

    // Get references to the data table header and body
    const dataThead = document.querySelector('#dataTable thead');
    const dataTbody = document.querySelector('#dataTable tbody');
    dataThead.innerHTML = '';  // Clear existing headers
    dataTbody.innerHTML = '';  // Clear existing data

    // Step 2.1: Create the header row with column names
    const headerRow = document.createElement('tr');
    for (const column of table.columns) {
        const th = document.createElement('th');
        th.textContent = column.name;  // Set column name as header text
        headerRow.appendChild(th);
    }
    dataThead.appendChild(headerRow);  // Add header row to table

    // Step 2.2: Create data rows - one row for each record in the table
    table.rows.forEach(rowData => {
        const row = document.createElement('tr');

        // For each column, create a cell with the corresponding data
        for (const column of table.columns) {
            const td = document.createElement('td');

            // Get the cell data for this column
            let cellData = rowData[column.name];

            // Format complex data types (objects/arrays) as JSON strings
            if (typeof cellData === 'object' && cellData !== null) {
                cellData = JSON.stringify(cellData);
            }

            // Display the data, or 'NULL' if the value is null/undefined
            td.textContent = cellData !== null && cellData !== undefined ? cellData : 'NULL';
            row.appendChild(td);
        }

        // Add the completed row to the table body
        dataTbody.appendChild(row);
    });

    // Step 2.3: Update the row count display
    document.getElementById('rowCount').textContent = table.rows.length;

    // Step 2.4: Update the table name in the schema section
    document.getElementById('tableName').textContent = table.name;

    // ==================== SECTION 3: POPULATE RELATIONSHIPS ====================
    // Shows foreign key relationships (how this table connects to other tables)

    // Get reference to the relationships list
    const relationshipsList = document.getElementById('relationshipsList');
    relationshipsList.innerHTML = '';  // Clear existing relationships

    // Step 3.1: Filter relationships to only show ones involving this table
    // A table can be either the source or target of a relationship
    const tableRelationships = relationships.filter(rel =>
        rel.sourceTable === tableName || rel.targetTable === tableName
    );

    // Step 3.2: Display relationships or "No relationships" message
    if (tableRelationships.length === 0) {
        relationshipsList.innerHTML = '<li>No relationships</li>';
    } else {
        // Create a list item for each relationship
        tableRelationships.forEach(rel => {
            const li = document.createElement('li');

            // Format the relationship description based on type
            let description = '';
            if (rel.type === 'one-to-many') {
                // One record in source relates to many in target (e.g., one user has many orders)
                description = `One-to-Many: ${rel.sourceTable}.${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn}`;
            } else if (rel.type === 'many-to-one') {
                // Many records in source relate to one in target (e.g., many orders belong to one user)
                description = `Many-to-One: ${rel.sourceTable}.${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn}`;
            } else if (rel.type === 'one-to-one') {
                // One record in source relates to exactly one in target (e.g., one user has one profile)
                description = `One-to-One: ${rel.sourceTable}.${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn}`;
            }

            li.textContent = description;
            relationshipsList.appendChild(li);
        });
    }

    // ==================== SECTION 4: SHOW ALL SECTIONS ====================
    // Make all three sections visible (they start hidden)
    document.getElementById('tableSchema').style.display = 'block';
    document.getElementById('tableData').style.display = 'block';
    document.getElementById('relationships').style.display = 'block';
}

/**
 * SHOW MODAL FUNCTION
 * Creates and displays a modal popup window to show content to the user
 * This is a reusable utility function for displaying the SQL viewer and other content
 *
 * @param {string} content - HTML content to display inside the modal
 * @param {string} title - Title text to show at the top of the modal
 */
function showModal(content, title) {
    // Step 1: Create the modal container element
    const modal = document.createElement('div');
    modal.className = 'modal';  // Apply modal CSS styling

    // Step 2: Build the modal structure with HTML
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Close button (×) - clicking removes the modal from the page -->
            <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>

            <!-- Modal title with terminal-style prefix (>_) -->
            <h3>>_ ${title}</h3>

            <!-- Modal body - contains the SQL viewer or other content -->
            <div class="modal-body">${content}</div>
        </div>
    `;

    // Step 3: Add the modal to the page (makes it visible)
    document.body.appendChild(modal);
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `cyber-notification ${type}`;
    notification.innerHTML = `
        <span class="notification-text">>_ ${message}</span>
        <div class="notification-glow"></div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function resetStatusIndicators() {
    [analyzingStatus, categorizingStatus, storageStatus, schemaStatus].forEach(status => {
        if (status) {
            status.classList.remove('active', 'pulse');
        }
    });
}

function resetProgress() {
    if (progressFill) {
        progressFill.style.width = '0%';
    }
    if (progressText) {
        progressText.textContent = '0%';
    }
}

function clearResults() {
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="result-placeholder">
                <div class="scan-line"></div>
                <p>>_ PROCESSING_DATA...</p>
            </div>
        `;
    }
    if (analysisResults) {
        analysisResults.innerHTML = `
            <div class="analysis-placeholder">
                <p>>_ UPLOAD_FILES_TO_SEE_INTELLIGENT_ANALYSIS</p>
            </div>
        `;
    }
}

function updateProgress(percentage) {
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    if (progressText) {
        progressText.textContent = `${Math.round(percentage)}%`;
    }
}

function setStatusActive(element, active) {
    if (element) {
        if (active) {
            element.classList.add('active', 'pulse');
        } else {
            element.classList.remove('active', 'pulse');
        }
    }
}

function addCyberEffects() {
    setInterval(() => {
        if (Math.random() > 0.7) {
            const logo = document.querySelector('.logo');
            if (logo) {
                logo.style.transform = 'translateX(' + (Math.random() * 4 - 2) + 'px)';
                setTimeout(() => {
                    logo.style.transform = 'translateX(0)';
                }, 100);
            }
        }
    }, 3000);
}

function addLogoutButton() {
    const header = document.querySelector('.header');
    if (!header) {
        console.error('Header element not found');
        return;
    }

    // Check if logout button already exists in HTML
    const existingLogout = header.querySelector('.logout-btn');
    if (existingLogout) {
        console.log('Logout button already exists in HTML');
        // Just add the event listener if it doesn't have onclick
        if (!existingLogout.hasAttribute('onclick')) {
            existingLogout.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Logout clicked');
                AuthSystem.logout();
            });
        }
        return;
    }

    // If no button exists, create one dynamically
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'cyber-btn logout-btn';
    logoutBtn.innerHTML = `
        <span class="btn-text">LOGOUT</span>
        <span class="btn-glow"></span>
    `;

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Logout clicked');
        AuthSystem.logout();
    });

    header.style.position = 'relative';
    header.appendChild(logoutBtn);
    console.log('Logout button added dynamically');
}

// Storage Management Functions
async function optimizeStorage() {
    showNotification('OPTIMIZING_STORAGE_PLEASE_WAIT', 'success');
    // Add storage optimization logic here
    setTimeout(() => {
        showNotification('STORAGE_OPTIMIZATION_COMPLETE', 'success');
    }, 2000);
}

async function clearCache() {
    // First show storage quota info
    const quotaInfo = await dataProcessor.storageSystem.checkStorageQuota();
    let message = 'ARE_YOU_SURE_YOU_WANT_TO_CLEAR_ALL_CACHE?_THIS_WILL_NOT_DELETE_YOUR_FILES.';

    if (quotaInfo) {
        message += `\n\nCurrent storage usage: ${quotaInfo.percentUsed}% (${dataProcessor.formatFileSize(quotaInfo.usage)} of ${dataProcessor.formatFileSize(quotaInfo.quota)})`;
    }

    if (confirm(message)) {
        try {
            // Clear temporary data but keep user files
            localStorage.removeItem('data_bhandaar_temp');

            // Clear browser cache if available
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            showNotification('CACHE_CLEARED_SUCCESSFULLY', 'success');

            // Refresh storage stats
            await dataProcessor.updateStorageStats();
        } catch (error) {
            showNotification(`CACHE_CLEAR_FAILED: ${error.message}`, 'error');
        }
    }
}

async function exportAllData() {
    try {
        const files = await dataProcessor.getUserFiles();
        if (files.length === 0) {
            showNotification('NO_FILES_TO_EXPORT', 'error');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            username: dataProcessor.userSession.username,
            totalFiles: files.length,
            files: files
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data_bhandaar_export_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('DATA_EXPORTED_SUCCESSFULLY', 'success');
    } catch (error) {
        showNotification(`EXPORT_FAILED: ${error.message}`, 'error');
    }
}

// JSON Conversion Preview Functions
function displayConversionPreview(preview) {
    const previewContainer = document.getElementById('conversionPreview');
    const previewContent = document.getElementById('previewContent');

    if (!preview) {
        previewContainer.style.display = 'none';
        return;
    }

    previewContainer.style.display = 'block';

    let html = '<div class="preview-grid">';

    // Original JSON info
    html += `
        <div class="preview-section">
            <h4>>_ ORIGINAL_JSON</h4>
            <div class="preview-stats">
                <p>TYPE: ${preview.original.type}</p>
                <p>SIZE: ${formatFileSize(preview.original.size)}</p>
                <p>ITEMS: ${preview.original.itemCount}</p>
            </div>
        </div>
    `;

    // SQL conversion preview
    if (preview.sql) {
        html += `
            <div class="preview-section">
                <h4>>_ SQL_STRUCTURE</h4>
                <div class="preview-stats">
                    <p>TABLES: ${preview.sql.tableCount}</p>
                    <p>TOTAL_ROWS: ${preview.sql.totalRows}</p>
                    <p>RELATIONSHIPS: ${preview.sql.relationships}</p>
                </div>
                <div class="sql-preview">
                    <h5>MAIN_TABLE: ${preview.sql.mainTable.name}</h5>
                    <table class="preview-table">
                        <thead>
                            <tr>
                                ${preview.sql.mainTable.columns.slice(0, 5).map(col => `<th>${col}</th>`).join('')}
                                ${preview.sql.mainTable.columns.length > 5 ? '<th>...</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${preview.sql.mainTable.rows.slice(0, 3).map(row => `
                                <tr>
                                    ${row.slice(0, 5).map(val => `<td>${val !== null ? val : 'NULL'}</td>`).join('')}
                                    ${row.length > 5 ? '<td>...</td>' : ''}
                                </tr>
                            `).join('')}
                            ${preview.sql.mainTable.rows.length > 3 ? '<tr><td colspan="100%">...</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // NoSQL conversion preview
    if (preview.nosql) {
        html += `
            <div class="preview-section">
                <h4>>_ NOSQL_STRUCTURE</h4>
                <div class="preview-stats">
                    <p>COLLECTIONS: ${preview.nosql.collectionCount}</p>
                    <p>DOCUMENTS: ${preview.nosql.totalDocuments}</p>
                    <p>INDEXES: ${preview.nosql.indexes}</p>
                </div>
                <div class="nosql-preview">
                    <h5>MAIN_COLLECTION: ${preview.nosql.mainCollection.name}</h5>
                    <div class="document-list">
                        ${preview.nosql.mainCollection.documents.slice(0, 2).map((doc, idx) => `
                            <div class="document-card">
                                <div class="document-header">DOCUMENT_${idx + 1}</div>
                                <pre class="document-content">${JSON.stringify(doc, null, 2).substring(0, 200)}${JSON.stringify(doc, null, 2).length > 200 ? '...' : ''}</pre>
                            </div>
                        `).join('')}
                        ${preview.nosql.mainCollection.documents.length > 2 ? `<p class="more-docs">... and ${preview.nosql.mainCollection.documents.length - 2} more documents</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    previewContent.innerHTML = html;
}

// Setup toggle listeners for conversion options
function setupConversionToggles() {
    const convertToSQL = document.getElementById('convertToSQL');
    const convertToNoSQL = document.getElementById('convertToNoSQL');
    const storeOriginal = document.getElementById('storeOriginal');

    // Update toggle text on change
    [convertToSQL, convertToNoSQL, storeOriginal].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', function() {
                const toggleText = this.parentElement.querySelector('.toggle-text');
                if (toggleText) {
                    toggleText.textContent = this.checked ? 'ON' : 'OFF';
                }
            });
        }
    });
}

// Make functions globally available
window.downloadFile = downloadFile;
window.viewFile = viewFile;
window.deleteFile = deleteFile;
window.optimizeStorage = optimizeStorage;
window.clearCache = clearCache;
window.exportAllData = exportAllData;
window.displayConversionPreview = displayConversionPreview;
window.storeAndProcessFiles = storeAndProcessFiles;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupConversionToggles();
});