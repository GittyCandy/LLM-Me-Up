document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const startResearchBtn = document.getElementById('startResearch');
    const researchTopic = document.getElementById('researchTopic');
    const researchOutput = document.getElementById('researchOutput');
    const exportBtn = document.getElementById('exportBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressContainer = document.getElementById('progressContainer');
    const depthSelect = document.getElementById('depth');

    // Agent status elements
    const agentStatusElements = {
        input: document.getElementById('inputAgentStatus'),
        query: document.getElementById('queryAgentStatus'),
        web: document.getElementById('webAgentStatus'),
        research: document.getElementById('researchAgentStatus'),
        summary: document.getElementById('summaryAgentStatus'),
        format: document.getElementById('formatAgentStatus')
    };

    // Uploaded files
    let uploadedFiles = [];

    // Event Listeners
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#4361ee';
        dropzone.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '#e9ecef';
        dropzone.style.backgroundColor = 'transparent';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#e9ecef';
        dropzone.style.backgroundColor = 'transparent';

        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFiles(fileInput.files);
        }
    });

    startResearchBtn.addEventListener('click', startResearchProcess);
    exportBtn.addEventListener('click', exportReport);

    // Functions
    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type === 'application/pdf' ||
                file.type === 'application/msword' ||
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                uploadedFiles.push(file);
            }
        }
        updateFileList();
    }

    function updateFileList() {
        fileList.innerHTML = '';
        uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name}</span>
                <i class="fas fa-times" data-index="${index}"></i>
            `;
            fileList.appendChild(fileItem);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.file-item i').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(icon.getAttribute('data-index'));
                uploadedFiles.splice(index, 1);
                updateFileList();
            });
        });
    }

    function updateAgentStatus(agent, status) {
        const element = agentStatusElements[agent];
        element.className = 'status-item';

        switch(status) {
            case 'active':
                element.classList.add('status-active');
                element.querySelector('.status-state').textContent = 'Processing';
                break;
            case 'success':
                element.classList.add('status-success');
                element.querySelector('.status-state').textContent = 'Completed';
                break;
            case 'error':
                element.classList.add('status-error');
                element.querySelector('.status-state').textContent = 'Error';
                break;
            default:
                element.querySelector('.status-state').textContent = 'Idle';
        }
    }

    function updateProgress(percentage, message) {
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = message;
    }

    async function startResearchProcess() {
        const topic = researchTopic.value.trim();
        if (!topic) {
            alert('Please enter a research topic');
            return;
        }

        // Reset UI
        researchOutput.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Research in progress...</p>
            </div>
        `;
        startResearchBtn.disabled = true;
        exportBtn.disabled = true;
        updateProgress(0, 'Initializing research process...');

        // Prepare form data
        const formData = new FormData();
        formData.append('topic', topic);
        formData.append('depth', depthSelect.value);
        uploadedFiles.forEach(file => formData.append('files', file));

        try {
            // Start the research process
            const response = await fetch('/api/research', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Research process failed');

            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let reportContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const data = JSON.parse(chunk);

                // Update based on agent progress
                if (data.agent) {
                    updateAgentStatus(data.agent, data.status);
                    if (data.message) {
                        updateProgress(data.progress, data.message);
                    }
                }

                // Accumulate report content
                if (data.content) {
                    reportContent += data.content;
                    researchOutput.innerHTML = formatReportContent(reportContent);
                    researchOutput.scrollTop = researchOutput.scrollHeight;
                }
            }

            // Finalize
            updateProgress(100, 'Research completed');
            startResearchBtn.disabled = false;
            exportBtn.disabled = false;

        } catch (error) {
            console.error('Error:', error);
            researchOutput.innerHTML = `
                <div class="placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error: ${error.message}</p>
                </div>
            `;
            updateProgress(0, 'Error occurred');
            startResearchBtn.disabled = false;
        }
    }

    function formatReportContent(content) {
        // Simple formatting for now - could be enhanced with Markdown parsing
        return `
            <div class="report-content">
                <h2 class="report-title">Research Report</h2>
                <div>${content.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    }

    function exportReport() {
        const content = researchOutput.innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'research_report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});