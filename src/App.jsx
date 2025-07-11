import React, { useState, useEffect, useMemo } from 'react';

// --- Helper Functions ---
/**
 * Parses a CSV string into an array of objects.
 * @param {string} csvText The raw CSV string.
 * @returns {Array<Object>} An array of objects representing the rows.
 */
const parseCSV = (csvText) => {
    if (!csvText) return [];
    const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const entry = {};
        header.forEach((key, index) => {
            entry[key] = values[index] ? values[index].replace(/"/g, '').trim() : '';
        });
        return entry;
    });
    return data;
};

// --- Modal Component for AI Insights ---
const InsightsModal = ({ isOpen, onClose, isLoading, error, content }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">✨ AI-Powered Insights</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            <p className="mt-4 text-gray-600">Generating insights...</p>
                        </div>
                    )}
                    {error && <div className="text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
                    {content && !isLoading && (
                        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}></div>
                    )}
                </div>
                 <div className="p-4 border-t text-right">
                    <button onClick={onClose} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [rawData, setRawData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // View configuration state
    const [primaryDimension, setPrimaryDimension] = useState('Ad Group Name');
    const [drillDown, setDrillDown] = useState('none');
    const [expandedCell, setExpandedCell] = useState(null); // { primaryValue: string, drillDownKey: string }

    // AI Insights State
    const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsResult, setInsightsResult] = useState('');
    const [insightsError, setInsightsError] = useState('');

    // --- File Handling ---
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setRawData([]);
        setFileName('');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const parsedData = parseCSV(text);
                if (parsedData.length === 0) throw new Error("CSV file is empty or invalid.");
                
                const requiredColumns = ['Ad Group Name', 'Ad Campaign Name', 'Company ICP Priority for Contacts', 'Lifecycle Stage', 'Job Title', 'Department'];
                const firstRow = parsedData[0];
                const missingColumns = requiredColumns.filter(col => !(col in firstRow));
                if (missingColumns.length > 0) throw new Error(`CSV is missing columns: ${missingColumns.join(', ')}`);

                setRawData(parsedData);
                setFileName(file.name);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError("Failed to read the file.");
            setIsLoading(false);
        };
        reader.readAsText(file);
    };
    
    const resetData = () => {
        setRawData([]);
        setFileName('');
        setError(null);
    };

    // --- Data Processing ---
    const { tableHeaders, tableRows } = useMemo(() => {
        if (!rawData.length) return { tableHeaders: [], tableRows: [] };
        
        const getDrillDownKey = (row, level) => {
            switch (level) {
                case 'icp': return row['Company ICP Priority for Contacts'];
                case 'lifecycle': return row['Lifecycle Stage'];
                case 'job_title': return row['Job Title'];
                case 'department': return row['Department'];
                default: return null;
            }
        };

        const groupedData = rawData.reduce((acc, row) => {
            const key = row[primaryDimension];
            if (!key) return acc;
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});

        let dynamicHeaders = [];
        if (drillDown !== 'none' && drillDown !== 'combined') {
            const allKeys = new Set(rawData.map(row => getDrillDownKey(row, drillDown)).filter(Boolean));
            dynamicHeaders = Array.from(allKeys).sort();
        } else if (drillDown === 'combined') {
            const allIcpKeys = new Set(rawData.map(row => row['Company ICP Priority for Contacts']).filter(Boolean));
            dynamicHeaders = Array.from(allIcpKeys).sort();
        }

        const finalRows = Object.entries(groupedData).map(([primaryValue, contacts]) => {
            const total = contacts.length;
            const rowData = { primaryValue, total, breakdown: {} };

            if (drillDown !== 'none' && drillDown !== 'combined') {
                rowData.breakdown = contacts.reduce((acc, contact) => {
                    const key = getDrillDownKey(contact, drillDown);
                    if (key) acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
            } else if (drillDown === 'combined') {
                const icpGroups = contacts.reduce((acc, contact) => {
                    const icpKey = contact['Company ICP Priority for Contacts'];
                    if (!icpKey) return acc;
                    if (!acc[icpKey]) acc[icpKey] = [];
                    acc[icpKey].push(contact);
                    return acc;
                }, {});

                rowData.breakdown = Object.entries(icpGroups).reduce((acc, [icpKey, icpContacts]) => {
                    acc[icpKey] = {
                        count: icpContacts.length,
                        lifecycleDistribution: icpContacts.reduce((dist, contact) => {
                            const lifecycleKey = contact['Lifecycle Stage'];
                            if (lifecycleKey) dist[lifecycleKey] = (dist[lifecycleKey] || 0) + 1;
                            return dist;
                        }, {})
                    };
                    return acc;
                }, {});
            }
            return rowData;
        });

        const headers = [primaryDimension, 'Total Contacts', ...dynamicHeaders];
        return { tableHeaders: headers, tableRows: finalRows };
    }, [rawData, primaryDimension, drillDown]);
    
    // --- Event Handlers ---
    const handleCellClick = (primaryValue, drillDownKey) => {
        if (expandedCell && expandedCell.primaryValue === primaryValue && expandedCell.drillDownKey === drillDownKey) {
            setExpandedCell(null);
        } else {
            setExpandedCell({ primaryValue, drillDownKey });
        }
    };

    const handleDrillDownChange = (e) => {
        setDrillDown(e.target.value);
        setExpandedCell(null); // Reset expanded view on drilldown change
    };

    // --- Gemini API Call ---
    const generateInsights = async () => {
        setInsightsLoading(true);
        setInsightsError('');
        setInsightsResult('');
        setIsInsightsModalOpen(true);

        const dataSummary = tableRows.map(row => {
            const breakdown = tableHeaders.slice(2).map(header => {
                let count = 0;
                 if (drillDown === 'combined') {
                    count = row.breakdown[header] ? row.breakdown[header].count : 0;
                } else {
                    count = row.breakdown[header] || 0;
                }
                const percentage = row.total > 0 ? ((count / row.total) * 100).toFixed(1) : 0;
                return `${header}: ${count} (${percentage}%)`;
            }).join(', ');
            return `${row.primaryValue} (Total: ${row.total}): ${breakdown || 'No breakdown'}`;
        }).join('\n');

        const prompt = `
            You are a marketing campaign analyst. Based on the following data summary, provide actionable insights.
            The data is grouped by "${primaryDimension}" and drilled down by "${drillDown}". The available data points for drill down include 'Company ICP Priority for Contacts', 'Lifecycle Stage', 'Job Title', and 'Department'.
            
            Data:
            ${dataSummary}

            Please analyze this data and identify:
            1. Top-performing groups based on total contacts and their composition (e.g., Company ICP Priority, Lifecycle Stage, Job Title, Department).
            2. Any underperforming groups or areas that might need attention.
            3. Interesting or surprising trends in the data, considering all available dimensions.
            4. Provide 2-3 specific, actionable recommendations for optimizing future campaigns based on these findings.

            Present the insights in a clear, easy-to-read format.
        `;

        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0) {
                setInsightsResult(result.candidates[0].content.parts[0].text);
            } else {
                throw new Error("No content received from the API.");
            }
        } catch (err) {
            setInsightsError(`Failed to generate insights. ${err.message}`);
        } finally {
            setInsightsLoading(false);
        }
    };


    // --- Render Logic ---
    if (rawData.length === 0) {
        return (
            <div className="bg-gray-50 min-h-screen flex flex-col justify-center items-center p-4 font-sans">
                <div className="w-full max-w-lg text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Campaign Performance Analyzer</h1>
                    <p className="text-gray-600 mb-8">Upload your CSV file to begin.</p>
                    <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
                        <label htmlFor="file-upload" className="w-full cursor-pointer bg-indigo-600 text-white font-bold py-3 px-6 rounded-md hover:bg-indigo-700 transition-colors duration-300 inline-block">
                            {isLoading ? 'Processing...' : 'Select CSV File'}
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isLoading} />
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                    </div>
                    <div className="mt-4 text-sm text-gray-500 px-2">
                        <p>Required columns: 'Ad Group Name', 'Ad Campaign Name', 'Company ICP Priority for Contacts', 'Lifecycle Stage', 'Job Title', 'Department'.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <InsightsModal isOpen={isInsightsModalOpen} onClose={() => setIsInsightsModalOpen(false)} isLoading={insightsLoading} error={insightsError} content={insightsResult} />
            <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8 flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Campaign Performance Analyzer</h1>
                            <p className="text-gray-600 mt-1">Displaying data from: <span className="font-semibold text-indigo-600">{fileName}</span></p>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={generateInsights} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors shadow-sm">✨ Generate Insights</button>
                            <button onClick={resetData} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-lg shadow-sm transition-colors">Upload New File</button>
                        </div>
                    </header>

                    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Measure By:</label>
                            <div className="flex rounded-md shadow-sm">
                                <button onClick={() => setPrimaryDimension('Ad Group Name')} className={`px-4 py-2 text-sm font-medium rounded-l-md w-full ${primaryDimension === 'Ad Group Name' ? 'bg-indigo-600 text-white z-10' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Ad Group Name</button>
                                <button onClick={() => setPrimaryDimension('Ad Campaign Name')} className={`-ml-px px-4 py-2 text-sm font-medium rounded-r-md w-full ${primaryDimension === 'Ad Campaign Name' ? 'bg-indigo-600 text-white z-10' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Ad Campaign Name</button>
                            </div>
                        </div>
                        <div className="flex-grow">
                            <label htmlFor="drilldown-select" className="block text-sm font-medium text-gray-700 mb-1">Drill Down By:</label>
                            <select id="drilldown-select" value={drillDown} onChange={handleDrillDownChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                <option value="none">None</option>
                                <option value="icp">Company ICP Priority</option>
                                <option value="lifecycle">Lifecycle Stage</option>
                                <option value="job_title">Job Title</option>
                                <option value="department">Department</option>
                                <option value="combined">ICP & Lifecycle Combined</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>{tableHeaders.map((header, index) => <th key={index} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">{header}</th>)}</tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableRows.map((row, rowIndex) => (
                                    <React.Fragment key={rowIndex}>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.primaryValue}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">{row.total}</td>
                                            {tableHeaders.slice(2).map((header, colIndex) => {
                                                if (drillDown === 'combined') {
                                                    const cellData = row.breakdown[header];
                                                    const count = cellData ? cellData.count : 0;
                                                    const percentage = row.total > 0 ? ((count / row.total) * 100).toFixed(1) : 0;
                                                    const isExpanded = expandedCell && expandedCell.primaryValue === row.primaryValue && expandedCell.drillDownKey === header;
                                                    return (
                                                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {count > 0 ? (
                                                                <button onClick={() => handleCellClick(row.primaryValue, header)} className={`w-full text-left p-1 rounded-md transition-colors ${isExpanded ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                                                                    <span className="font-semibold text-gray-800">{count}</span>
                                                                    <span className="ml-2 text-gray-500">({percentage}%)</span>
                                                                </button>
                                                            ) : (<span className="text-gray-400 p-1 block">0</span>)}
                                                        </td>
                                                    );
                                                }
                                                const count = row.breakdown[header] || 0;
                                                const percentage = row.total > 0 ? ((count / row.total) * 100).toFixed(1) : 0;
                                                return (
                                                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {count > 0 ? (
                                                            <div>
                                                                <span className="font-semibold text-gray-800">{count}</span>
                                                                <span className="ml-2 text-gray-500">({percentage}%)</span>
                                                            </div>
                                                        ) : (<span className="text-gray-400">0</span>)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {drillDown === 'combined' && expandedCell && expandedCell.primaryValue === row.primaryValue && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={tableHeaders.length} className="p-0">
                                                    <div className="p-4 bg-indigo-50">
                                                        <h4 className="font-bold text-sm text-indigo-800 mb-2">Lifecycle Stage distribution for "{expandedCell.drillDownKey}"</h4>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                            {Object.entries(row.breakdown[expandedCell.drillDownKey]?.lifecycleDistribution || {}).map(([stage, count]) => {
                                                                const totalForIcp = row.breakdown[expandedCell.drillDownKey].count;
                                                                const percentage = totalForIcp > 0 ? ((count / totalForIcp) * 100).toFixed(1) : 0;
                                                                return (
                                                                    <div key={stage} className="bg-white p-2 rounded-md border border-indigo-200">
                                                                        <div className="text-xs text-gray-600">{stage}</div>
                                                                        <div className="font-bold text-indigo-900">{count} <span className="text-sm font-normal text-gray-500">({percentage}%)</span></div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {tableRows.length === 0 && (
                                    <tr><td colSpan={tableHeaders.length} className="text-center py-10 text-gray-500">No data for selected criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
