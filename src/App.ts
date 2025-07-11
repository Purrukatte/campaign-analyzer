// Types
interface CSVRow {
    [key: string]: string;
}

// Helper Functions
const parseCSV = (csvText: string): CSVRow[] => {
    if (!csvText) return [];
    const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const header: string[] = lines[0].split(',').map(h => h.trim());
    const data: CSVRow[] = lines.slice(1).map(line => {
        const values: string[] = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const entry: CSVRow = {};
        header.forEach((key: string, index: number) => {
            entry[key] = values[index] ? values[index].replace(/"/g, '').trim() : '';
        });
        return entry;
    });
    return data;
};

export class CampaignAnalyzer {
    private container: HTMLElement;
    private rawData: CSVRow[] = [];
    private fileName: string = '';

    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) throw new Error(`Container element with id ${containerId} not found`);
        this.container = element;
        this.render();
    }

    private handleFileUpload = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsedData = parseCSV(text);
            if (parsedData.length === 0) throw new Error("CSV file is empty or invalid.");
            
            const requiredColumns = ['Ad Group Name', 'Ad Campaign Name', 'Company ICP Priority for Contacts', 'Lifecycle Stage', 'Job Title', 'Department'];
            const firstRow = parsedData[0];
            const missingColumns = requiredColumns.filter(col => !(col in firstRow));
            if (missingColumns.length > 0) throw new Error(`CSV is missing columns: ${missingColumns.join(', ')}`);

            this.rawData = parsedData;
            this.fileName = file.name;
            this.render();
        } catch (err) {
            this.showError(err instanceof Error ? err.message : 'Failed to process file');
        }
    };

    private showError(message: string) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = 'red';
        errorDiv.style.marginTop = '1rem';
        this.container.appendChild(errorDiv);
    }

    private render() {
        this.container.innerHTML = '';

        if (this.rawData.length === 0) {
            this.renderUploadForm();
        } else {
            this.renderDataView();
        }
    }

    private renderUploadForm() {
        this.container.innerHTML = `
            <div class="upload-form" style="text-align: center; padding: 2rem;">
                <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Campaign Performance Analyzer</h1>
                <div style="margin-bottom: 1rem;">
                    <input type="file" id="file-upload" accept=".csv" style="display: none;">
                    <button id="upload-button" style="padding: 0.5rem 1rem; background-color: #4f46e5; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
                        Select CSV File
                    </button>
                </div>
                <p style="color: #666; font-size: 0.875rem;">
                    Required columns: 'Ad Group Name', 'Ad Campaign Name', 'Company ICP Priority for Contacts', 'Lifecycle Stage', 'Job Title', 'Department'.
                </p>
            </div>
        `;

        const uploadButton = document.getElementById('upload-button');
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        uploadButton?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', this.handleFileUpload);
    }

    private renderDataView() {
        // Implement your data view here
        this.container.innerHTML = `
            <div style="padding: 1rem;">
                <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Campaign Performance Analyzer</h1>
                <p>Displaying data from: ${this.fileName}</p>
                <button id="reset-button" style="padding: 0.5rem 1rem; background-color: #4f46e5; color: white; border: none; border-radius: 0.375rem; cursor: pointer; margin-top: 1rem;">
                    Upload New File
                </button>
                <div id="data-container" style="margin-top: 1rem;">
                    ${this.renderDataTable()}
                </div>
            </div>
        `;

        const resetButton = document.getElementById('reset-button');
        resetButton?.addEventListener('click', () => {
            this.rawData = [];
            this.fileName = '';
            this.render();
        });
    }

    private renderDataTable(): string {
        const groups = this.rawData.reduce((acc, row) => {
            const key = row['Ad Group Name'];
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {} as Record<string, CSVRow[]>);

        const tableRows = Object.entries(groups).map(([group, rows]) => `
            <tr>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${group}</td>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${rows.length}</td>
            </tr>
        `).join('');

        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #eee;">Ad Group Name</th>
                        <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #eee;">Total Contacts</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }
}

// Initialize the app

