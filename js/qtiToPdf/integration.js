/**
 * QTI to PDF Integration
 * Integrates QTI to PDF conversion with existing Quick Convert functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the Quick Convert page
    const isQuickConvertPage = document.querySelector('title')?.textContent.includes('Quick Convert');
    
    // Add QTI to PDF tab to the navigation if on Quick Convert page
    if (isQuickConvertPage) {
        addQtiToPdfTab();
    }
    
    // Check if we're on QTI to PDF page (standalone)
    const isQtiToPdfPage = document.querySelector('title')?.textContent.includes('QTI to PDF');
    
    // Initialize QTI to PDF converter if on its dedicated page
    if (isQtiToPdfPage) {
        initQtiToPdfConverter();
    }
});

/**
 * Add QTI to PDF tab to Quick Convert page navigation
 */
function addQtiToPdfTab() {
    // Find navigation container
    const navContainer = document.querySelector('.nav-container');
    
    if (!navContainer) return;
    
    // Get navigation list
    const navList = navContainer.querySelector('ul');
    
    if (!navList) return;
    
    // Create new tab list item
    const qtiToPdfTab = document.createElement('li');
    qtiToPdfTab.innerHTML = `<a href="#" id="qti-to-pdf-tab">QTI to PDF</a>`;
    
    // Add to navigation
    navList.appendChild(qtiToPdfTab);
    
    // Create a new section for QTI to PDF
    const qtiToPdfSection = document.createElement('div');
    qtiToPdfSection.id = 'qti-to-pdf-section';
    qtiToPdfSection.className = 'qti-to-pdf-container hidden';
    
    // Create content for QTI to PDF section
    qtiToPdfSection.innerHTML = `
        <div class="qti-upload-section">
            <div id="qti-drop-area" class="drop-area">
                <div class="drop-message">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <h3>Drag & Drop QTI Zip File</h3>
                    <p>or</p>
                    <label for="qti-file-input" class="file-input-label">Browse Files</label>
                    <input type="file" id="qti-file-input" accept=".zip" hidden>
                </div>
                <div id="qti-file-info" class="file-info hidden">
                    <div class="file-preview">
                        <i class="fas fa-file-archive"></i>
                        <div>
                            <h4 id="qti-file-name">filename.zip</h4>
                            <span id="qti-file-size">0 KB</span>
                        </div>
                    </div>
                    <button id="qti-remove-file" class="remove-file-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="qti-options-section">
            <h3>PDF Options</h3>
            <div class="form-group">
                <label for="qti-doc-title">Document Title:</label>
                <input type="text" id="qti-doc-title" placeholder="Enter document title">
            </div>
            
            <div class="form-group">
                <label>Content Options:</label>
                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input type="checkbox" id="qti-include-answers" checked>
                        <label for="qti-include-answers">Generate Answer Key</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="qti-include-images" checked>
                        <label for="qti-include-images">Include Images</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="qti-include-page-numbers" checked>
                        <label for="qti-include-page-numbers">Include Page Numbers</label>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="qti-paper-size">Paper Size:</label>
                <select id="qti-paper-size">
                    <option value="a4">A4 Paper</option>
                    <option value="letter">Letter (8.5" x 11")</option>
                    <option value="legal">Legal (8.5" x 14")</option>
                    <option value="short-bond">Short Bond Paper</option>
                    <option value="long-bond">Long Bond Paper</option>
                </select>
            </div>
            
            <button id="qti-convert-btn" class="primary-btn" disabled>
                <i class="fas fa-file-pdf"></i> Convert to PDF
            </button>
        </div>
        
        <div class="qti-preview-section">
            <h3>Preview</h3>
            <div id="qti-preview" class="preview-area">
                <p class="placeholder-text">QTI content will appear here after upload</p>
            </div>
        </div>
        
        <div id="qti-results-section" class="qti-results-section hidden">
            <h3>Conversion Results</h3>
            <div id="qti-conversion-summary" class="conversion-summary"></div>
            <button id="qti-download-btn" class="secondary-btn">
                <i class="fas fa-download"></i> Download PDF
            </button>
            <button id="qti-download-answer-key-btn" class="secondary-btn hidden">
                <i class="fas fa-download"></i> Download Answer Key PDF
            </button>
        </div>
        
        <div id="qti-loading-overlay" class="loading-overlay hidden">
            <div class="spinner"></div>
            <p>Converting QTI to PDF...</p>
        </div>
    `;
    
    // Add QTI to PDF section to main container
    document.querySelector('.container').appendChild(qtiToPdfSection);
    
    // Add required CSS styles
    addQtiToPdfStyles();
    
    // Add event handler for tab click
    document.getElementById('qti-to-pdf-tab').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Hide all sections
        const mainContent = document.querySelector('main');
        const mainChildren = mainContent.children;
        
        for (let i = 0; i < mainChildren.length; i++) {
            if (mainChildren[i].id !== 'qti-to-pdf-section') {
                mainChildren[i].classList.add('hidden');
            }
        }
        
        // Show QTI to PDF section
        document.getElementById('qti-to-pdf-section').classList.remove('hidden');
        
        // Update active tab
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById('qti-to-pdf-tab').classList.add('active');
        
        // Initialize QTI to PDF converter if not already
        if (!window.qtiToPdfUI) {
            initQtiToPdfConverter();
        }
    });
    
    // Add custom event handler for other tabs
    const otherTabs = document.querySelectorAll('nav a:not(#qti-to-pdf-tab)');
    otherTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Hide QTI to PDF section when another tab is clicked
            document.getElementById('qti-to-pdf-section').classList.add('hidden');
        });
    });
}

/**
 * Add QTI to PDF styles to the page
 */
function addQtiToPdfStyles() {
    // Check if styles are already added
    if (document.getElementById('qti-to-pdf-styles')) return;
    
    // Create style element
    const styleEl = document.createElement('style');
    styleEl.id = 'qti-to-pdf-styles';
    
    // Add CSS
    styleEl.textContent = `
        /* QTI to PDF Styles */
        .qti-to-pdf-container {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 30px;
        }
        
        @media (max-width: 768px) {
            .qti-to-pdf-container {
                grid-template-columns: 1fr;
            }
        }
        
        /* Rest of the styles... (abbreviated for brevity) */
        
        .qti-to-pdf-container h3 {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
        }
        
        .drop-area {
            border: 2px dashed #e2e8f0;
            border-radius: 10px;
            padding: 40px 20px;
            text-align: center;
            transition: all 0.3s ease;
            background-color: #f5f7fa;
            position: relative;
            cursor: pointer;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        
        .drop-area.dragover {
            border-color: #4a6cf7;
            background-color: rgba(74, 108, 247, 0.05);
        }
        
        /* Add abbreviated styles for other elements */
        
        .qti-error-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: white;
            border-left: 4px solid #e53e3e;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 15px;
            border-radius: 5px;
            display: flex;
            align-items: center;
            min-width: 300px;
            max-width: 400px;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        /* More abbreviated styles */
    `;
    
    // Add to document head
    document.head.appendChild(styleEl);
}

/**
 * Initialize QTI to PDF Converter
 */
function initQtiToPdfConverter() {
    // Check if jsPDF is available, load if not
    if (!window.jspdf) {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
            .then(() => {
                // Check if JSZip is available, load if not
                if (!window.JSZip) {
                    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
                }
            })
            .then(() => {
                // Load QTI to PDF scripts
                return Promise.all([
                    loadScript('../js/quickConvert/qtiToPdf.js'),
                    loadScript('../js/quickConvert/qtiToPdfUI.js')
                ]);
            })
            .then(() => {
                // Initialize the UI
                window.qtiToPdfUI = new QTIToPDFUI();
            })
            .catch(error => {
                console.error('Error loading QTI to PDF scripts:', error);
                alert('Error loading QTI to PDF functionality. Please try again later.');
            });
    } else {
        // All scripts already loaded, just initialize
        if (window.QTIToPDFUI && !window.qtiToPdfUI) {
            window.qtiToPdfUI = new QTIToPDFUI();
        }
    }
}

/**
 * Load script dynamically
 * @param {String} src - Script URL
 * @returns {Promise} - Promise that resolves when script is loaded
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}