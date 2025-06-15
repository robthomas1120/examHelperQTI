document.addEventListener('DOMContentLoaded', function () {
  console.log("Modal.js loaded");

  // Create the modal HTML with both template options
  const modalHTML = `
    <div id="download-modal" class="modal">
        <div class="modal-overlay"></div>
        <div class="download-card">
            <div class="modal-close">&times;</div>
            <h2>Download Quiz Templates</h2>
            <p>Choose your preferred template format</p>
            
            <div class="template-section">
                <h3>Quick Convert Template</h3>
                <div class="download-options">
                    <a href="https://docs.google.com/spreadsheets/d/1vLxY2Abv4pw0l1dcvn7hRC0HKPHZKfYJ_f-RaNOI7c8/edit?usp=sharing" class="download-btn-large" target="_blank">
                        <i class="fab fa-google-drive"></i>
                        <span class="btn-text">Google Sheet</span>
                    </a>
                    
                    <button class="download-btn-large" id="download-quick-convert">
                        <i class="far fa-file-excel"></i>
                        <span class="btn-text">Download Excel</span>
                    </button>
                </div>
            </div>
            
            <div class="template-divider"></div>
            
            <div class="template-section">
                <h3>Item Bank Template</h3>
                <div class="download-options">
                    <a href="https://docs.google.com/spreadsheets/d/1lL1DDwAk88kdKhObe2SszN8LKAOHfEAVUsGsMFyd_Oo/edit?usp=sharing" class="download-btn-large" target="_blank">
                        <i class="fab fa-google-drive"></i>
                        <span class="btn-text">Google Sheet</span>
                    </a>
                    
                    <button class="download-btn-large" id="download-item-bank">
                        <i class="far fa-file-excel"></i>
                        <span class="btn-text">Download Excel</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  `;

  // Add the modal to the end of the body
  if (!document.getElementById('download-modal')) {
    console.log("Injecting modal HTML");
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv.firstElementChild);
  }

  // Use setTimeout to ensure the button is available (since navbar.js runs at the same time)
  setTimeout(function () {
    // Set up event listeners
    const downloadBtn = document.getElementById('download-template-btn');
    const modal = document.getElementById('download-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalClose = document.querySelector('.modal-close');
    
    if (downloadBtn && modal) {
      // Open modal when button is clicked
      downloadBtn.addEventListener('click', function (e) {
        e.preventDefault();
        console.log("Download button clicked");
        modal.classList.add('active');
        document.body.classList.add('modal-open');
      });

      // Close modal when X is clicked
      if (modalClose) {
        modalClose.addEventListener('click', function () {
          modal.classList.remove('active');
          document.body.classList.remove('modal-open');
        });
      }

      // Close modal when overlay is clicked
      if (modalOverlay) {
        modalOverlay.addEventListener('click', function () {
          modal.classList.remove('active');
          document.body.classList.remove('modal-open');
        });
      }

      // Close modal when ESC key is pressed
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
          modal.classList.remove('active');
          document.body.classList.remove('modal-open');
        }
      });

      // Handle Quick Convert Template download
      const downloadQuickConvertBtn = document.getElementById('download-quick-convert');
      if (downloadQuickConvertBtn) {
        downloadQuickConvertBtn.addEventListener('click', function () {
          console.log("Downloading Quick Convert Template...");
          // Request main process to download Quick Convert Template
          window.electronAPI.downloadTemplate('QuickConvertTemplate.xlsx');
        });
      }

      // Handle Item Bank Template download
      const downloadItemBankBtn = document.getElementById('download-item-bank');
      if (downloadItemBankBtn) {
        downloadItemBankBtn.addEventListener('click', function () {
          console.log("Downloading Item Bank Template...");
          // Request main process to download Item Bank Template
          window.electronAPI.downloadTemplate('ItemBankTemplate.xlsx');
        });
      }
    }
  }, 100); // Small delay to ensure navbar.js has completed
});