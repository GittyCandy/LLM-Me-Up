        let currentStep = 0;
        let isResearchRunning = false;
        let currentMode = 'standard';
        let researchData = {
            initialResearch: '',
            searchQueries: [],
            webResults: [],
            analysis: '',
            finalReport: '',
            references: [],
            reflections: []
        };

        // Initialize the UI
        updateWorkflowProgress();
        updateStatus('IDLE');

        function setMode(mode) {
            currentMode = mode;
            document.getElementById('standardModeBtn').classList.toggle('active', mode === 'standard');
            document.getElementById('quickModeBtn').classList.toggle('active', mode === 'quick');
            document.body.classList.toggle('quick-mode', mode === 'quick');

            // Update button styling
            const buttons = document.querySelectorAll('button:not(.mode-btn)');
            buttons.forEach(btn => {
                if (mode === 'quick') {
                    btn.classList.add('quick-mode');
                } else {
                    btn.classList.remove('quick-mode');
                }
            });

            logActivity(`Switched to ${mode === 'quick' ? 'QuickRead' : 'Standard'} mode`);
        }

        function updateWorkflowProgress() {
            // Update step classes
            document.querySelectorAll('.step').forEach((step, index) => {
                step.classList.remove('active', 'completed');
                if (index < currentStep) {
                    step.classList.add('completed');
                } else if (index === currentStep) {
                    step.classList.add('active');
                }
            });

            // Update progress line
            const progressPercentage = (currentStep / 5) * 100;
            document.getElementById('activeLine').style.width = `${progressPercentage}%`;
            document.getElementById('researchProgress').style.width = `${progressPercentage}%`;
        }

        function updateStatus(status) {
            const badge = document.getElementById('statusBadge');
            badge.textContent = status;

            badge.classList.remove('status-running', 'status-completed', 'status-error');

            if (status === 'RUNNING') {
                badge.classList.add('status-running');
            } else if (status === 'COMPLETED') {
                badge.classList.add('status-completed');
            } else if (status === 'ERROR') {
                badge.classList.add('status-error');
            }
        }

        function logActivity(message) {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';

            logEntry.innerHTML = `
                <div class="log-time">${timeString}</div>
                <div class="log-message">
                    <i class="fas fa-info-circle log-icon"></i>
                    <div>${message}</div>
                </div>
            `;

            document.getElementById('activityLog').prepend(logEntry);
        }

        function showLoading(show, message = '') {
            const loadingElement = document.getElementById('loading');
            loadingElement.style.display = show ? 'block' : 'none';

            if (message) {
                document.getElementById('loadingMessage').textContent = message;
            }
        }

        function switchTab(tabName) {
            // Update tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.textContent.toLowerCase().includes(tabName.toLowerCase())) {
                    tab.classList.add('active');
                }
            });

            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id.includes(tabName)) {
                    content.classList.add('active');
                }
            });
        }

        function formatReferences(references) {
            if (!references || references.length === 0) {
                return '<p>No references collected yet.</p>';
            }

            if (currentMode === 'quick') {
                return references.map(ref => `
                    <div class="reference-item">
                        <div class="reference-title">📚 ${ref.title || 'Untitled Source'}</div>
                        <div class="reference-url">🔗 ${ref.url || 'No URL available'}</div>
                        ${ref.summary ? `<div class="quick-tldr">${ref.summary}</div>` : ''}
                    </div>
                `).join('');
            } else {
                return references.map(ref => `
                    <div class="reference-item">
                        <div class="reference-title">${ref.title || 'Untitled Source'}</div>
                        <div class="reference-url">${ref.url || 'No URL available'}</div>
                        ${ref.summary ? `<p>${ref.summary}</p>` : ''}
                    </div>
                `).join('');
            }
        }

        function formatReflections(reflections) {
            if (!reflections || reflections.length === 0) {
                return '<p>No reflections generated yet.</p>';
            }

            if (currentMode === 'quick') {
                return reflections.map((reflection, index) => `
                    <div class="quick-point">
                        <strong>💭 Reflection ${index + 1}:</strong> ${reflection}
                    </div>
                `).join('');
            } else {
                return reflections.map((reflection, index) => `
                    <div class="section">
                        <h4 class="section-title">Reflection ${index + 1}</h4>
                        <p>${reflection}</p>
                    </div>
                `).join('');
            }
        }

        function formatResearchContent(content) {
            if (!content) return '<p>Research in progress...</p>';

            if (currentMode === 'quick') {
                // Simple formatting for quick mode - this would be enhanced by the agent
                return `
                    <div class="quick-content">
                        ${content.replace(/\n/g, '<br>')}
                    </div>
                `;
            } else {
                // Enhanced formatting for standard mode
                return `
                    <div class="section">
                        ${content.replace(/\n/g, '<br>')}
                    </div>
                `;
            }
        }

        function updateOutputDisplay() {
            // Update research output
            document.getElementById('researchOutput').innerHTML = formatResearchContent(
                researchData.finalReport || researchData.analysis || researchData.initialResearch
            );

            // Update references
            document.getElementById('referencesOutput').innerHTML = formatReferences(researchData.references);

            // Update reflections
            document.getElementById('reflectionsOutput').innerHTML = formatReflections(researchData.reflections);
        }

        async function quickReadCurrent() {
            const currentContent =
                researchData.finalReport ||
                researchData.analysis ||
                researchData.initialResearch ||
                document.getElementById('researchPrompt').value;

            if (!currentContent) {
                alert('No content available to summarize');
                return;
            }

            showLoading(true, 'Creating QuickRead summary...');
            logActivity('Generating QuickRead version of current content');

            try {
                const quickVersion = await callResearchAgent(currentContent, 'quickread', 'quick');

                // Store the quick version in the appropriate place
                if (researchData.finalReport) {
                    researchData.finalReport = quickVersion;
                } else if (researchData.analysis) {
                    researchData.analysis = quickVersion;
                } else if (researchData.initialResearch) {
                    researchData.initialResearch = quickVersion;
                }

                updateOutputDisplay();
                logActivity('QuickRead summary generated');
            } catch (error) {
                console.error('QuickRead error:', error);
                logActivity(`QuickRead failed: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        async function startFullResearch() {
            const prompt = document.getElementById('researchPrompt').value;
            if (!prompt) {
                alert('Please enter a research topic first');
                return;
            }

            // Reset research data
            researchData = {
                initialResearch: '',
                searchQueries: [],
                webResults: [],
                analysis: '',
                finalReport: '',
                references: [],
                reflections: []
            };

            isResearchRunning = true;
            document.getElementById('startResearch').disabled = true;
            document.getElementById('stopResearch').disabled = false;
            updateStatus('RUNNING');
            logActivity(`Starting ${currentMode === 'quick' ? 'QuickRead' : 'standard'} research process...`);

            try {
                // Step 1: Initial Research
                currentStep = 1;
                updateWorkflowProgress();
                showLoading(true, currentMode === 'quick' ? 'Generating quick overview...' : 'Generating initial research...');
                logActivity(currentMode === 'quick' ? 'Creating quick overview' : 'Generating initial research content');

                const initialResearch = await callResearchAgent(prompt, 'generate', currentMode);
                researchData.initialResearch = initialResearch;
                logActivity(currentMode === 'quick' ? 'Quick overview generated' : 'Initial research generated');
                updateOutputDisplay();

                // Step 2: Search Queries
                currentStep = 2;
                updateWorkflowProgress();
                showLoading(true, 'Generating search queries...');
                logActivity('Creating search queries');

                const searchQueries = await callResearchAgent(prompt, 'search', currentMode);
                researchData.searchQueries = extractSearchQueries(searchQueries);
                logActivity(`Generated ${researchData.searchQueries.length} search queries`);

                // Step 3: Web Research (simulated)
                currentStep = 3;
                updateWorkflowProgress();
                showLoading(true, currentMode === 'quick' ? 'Finding quick answers...' : 'Conducting web research...');
                logActivity('Starting web research phase');

                // Simulate web research with the LLM
                for (let i = 0; i < Math.min(researchData.searchQueries.length, currentMode === 'quick' ? 3 : 5); i++) {
                    if (!isResearchRunning) break;

                    const query = researchData.searchQueries[i];
                    logActivity(`Researching: "${query}"`);

                    const webResult = await callResearchAgent(query, 'web', currentMode);
                    const parsedResult = parseWebResult(webResult, currentMode);

                    researchData.webResults.push(parsedResult);
                    researchData.references.push({
                        title: parsedResult.title || `Result for: ${query}`,
                        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
                        summary: parsedResult.summary
                    });

                    updateOutputDisplay();
                }

                if (!isResearchRunning) {
                    logActivity('Research stopped by user');
                    throw new Error('Research stopped by user');
                }

                // Step 4: Analysis
                currentStep = 4;
                updateWorkflowProgress();
                showLoading(true, currentMode === 'quick' ? 'Analyzing key points...' : 'Analyzing findings...');
                logActivity('Analyzing research findings');

                const analysisContent = researchData.webResults.map(r => r.content).join('\n\n');
                const analysis = await callResearchAgent(analysisContent, 'analyze', currentMode);
                researchData.analysis = analysis;

                // Generate reflections
                const reflections = await callResearchAgent(analysis, 'reflect', currentMode);
                researchData.reflections = extractReflections(reflections, currentMode);
                logActivity('Analysis and reflections completed');
                updateOutputDisplay();

                // Step 5: Final Report
                currentStep = 5;
                updateWorkflowProgress();
                showLoading(true, currentMode === 'quick' ? 'Creating TL;DR report...' : 'Generating final report...');
                logActivity('Compiling final report');

                const reportContent = `${researchData.initialResearch}\n\n## Research Findings\n\n${analysis}`;
                const finalReport = await callResearchAgent(reportContent, 'report', currentMode);
                researchData.finalReport = finalReport;
                logActivity('Final report generated');
                updateOutputDisplay();

                // Research complete
                updateStatus('COMPLETED');
                logActivity('Research process completed successfully');
            } catch (error) {
                console.error('Research error:', error);
                updateStatus('ERROR');
                logActivity(`Error: ${error.message}`);
            } finally {
                showLoading(false);
                isResearchRunning = false;
                document.getElementById('startResearch').disabled = false;
                document.getElementById('stopResearch').disabled = true;
            }
        }

        function stopResearch() {
            isResearchRunning = false;
            logActivity('User requested research stop');
        }

        function exportResearch() {
            // Simple export functionality - could be enhanced
            const blob = new Blob([JSON.stringify(researchData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `research-report-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();

            URL.revokeObjectURL(url);
            logActivity('Exported research report');
        }

        function callResearchAgent(prompt, agentType, mode = 'standard') {
            return new Promise((resolve, reject) => {
                fetch('/api/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        agent_type: agentType,
                        mode: mode
                    }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => resolve(data.response))
                .catch(error => reject(error));
            });
        }

        function extractSearchQueries(text) {
            // Simple extraction of search queries from the generated text
            const queries = text.split('\n')
                .map(line => line.replace(/^\d+\.\s*/, '').trim())
                .filter(line => line.length > 0);

            return queries.slice(0, currentMode === 'quick' ? 3 : 5); // Return fewer queries in quick mode
        }

        function parseWebResult(text, mode) {
            // Simulate parsing web results - in a real app this would come from actual web search API
            if (mode === 'quick') {
                return {
                    title: text.split('\n')[0] || 'Web Result',
                    content: text,
                    summary: text.split('\n').slice(0, 2).join('\n') // Shorter summary for quick mode
                };
            } else {
                return {
                    title: text.split('\n')[0] || 'Web Result',
                    content: text,
                    summary: text.split('\n').slice(0, 3).join('\n')
                };
            }
        }

        function extractReflections(text, mode) {
            // Split reflections by numbered points or paragraphs
            if (mode === 'quick') {
                return text.split('\n')
                    .filter(line => line.trim().length > 0 && line.match(/[🤔🧐💭]/))
                    .map(line => line.trim());
            } else {
                return text.split('\n\n')
                    .filter(para => para.trim().length > 0)
                    .map(para => para.replace(/^\d+\.\s*/, '').trim());
            }
        }