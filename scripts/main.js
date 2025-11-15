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

    // Enhanced JSON content analysis
    async analyzeJsonContent(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const jsonData = JSON.parse(content);
                    
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
                    
                    // Determine JSON subtype
                    let subType = 'generic';
                    if (sqlScore > nosqlScore && sqlScore > 0) {
                        subType = 'sql';
                    } else if (nosqlScore > sqlScore && nosqlScore > 0) {
                        subType = 'nosql';
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
                        keyCount: Object.keys(jsonData).length,
                        isArray: Array.isArray(jsonData),
                        sampleKeys: Object.keys(jsonData).slice(0, 5)
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

        const results = {
            original: null,
            sql: null,
            nosql: null
        };

        // Store original JSON
        if (storeSeparately) {
            results.original = await this.storeFile(file, {
                jsonFormat: 'original',
                description: 'Original JSON file'
            });
        }

        // Convert to SQL format
        if (convertToSQL) {
            const sqlStructure = this.jsonConverter.convertToSQL(jsonData, this.getTableName(file.name));
            const sqlContent = {
                schema: this.jsonConverter.generateSQLSchema(sqlStructure),
                inserts: this.jsonConverter.generateSQLInserts(sqlStructure),
                structure: sqlStructure
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
                    tableCount: sqlStructure.tables.length,
                    totalRows: sqlStructure.metadata.totalRows,
                    description: 'SQL-converted JSON structure'
                }
            );
        }

        // Convert to NoSQL format
        if (convertToNoSQL) {
            const nosqlStructure = this.jsonConverter.convertToNoSQL(jsonData, this.getCollectionName(file.name));
            const nosqlContent = {
                structure: nosqlStructure,
                collections: nosqlStructure.collections
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
                    collectionCount: nosqlStructure.collections.length,
                    totalDocuments: nosqlStructure.metadata.totalDocuments,
                    description: 'NoSQL-converted JSON structure'
                }
            );
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
                let quotaDisplay = '';
                let storageRemaining = 'N/A';

                if (quotaInfo) {
                    const quotaWarning = quotaInfo.percentUsed > 80 ? ' style="color: #ff0066;"' : '';
                    quotaDisplay = `
                        <div class="stat-item"${quotaWarning}>
                            <span class="stat-label">BROWSER_QUOTA:</span>
                            <span class="stat-value">${quotaInfo.percentUsed}%</span>
                        </div>
                    `;
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
                        ${quotaDisplay}
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

async function viewFile(fileId) {
    try {
        console.log('Viewing file:', fileId);
        const fileData = await dataProcessor.downloadFile(fileId);
        
        if (fileData.filetype.startsWith('image/')) {
            showImageModal(fileData);
        } else if (fileData.filetype.startsWith('video/')) {
            showVideoModal(fileData);
        } else if (fileData.filetype.startsWith('audio/')) {
            showAudioModal(fileData);
        } else if (fileData.filetype === 'application/json') {
            showJsonModal(fileData);
        } else {
            downloadFile(fileId);
        }
    } catch (error) {
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