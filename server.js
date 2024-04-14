const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const axios = require('axios');
const port = 8080;
const app = express();
const fs = require('fs');
const db = require('./db');
const path = require('path');
app.use(bodyParser.json(), cors());

// Function to generate HTML table from data
function generateHTMLTable(data, css) {
    let html = `<body><style>${css}</style><table>`;
    // Assuming data is an array of objects with key-value pairs
    if (data && data.length > 0) {
        // Generating table headers from the keys of the first object
        html += '<tr>';
        Object.keys(data[0]).forEach(key => {
            html += `<th>${key}</th>`;
        });
        html += '</tr>';
        // Generating table rows with data
        data.forEach(item => {
            html += '<tr>';
            Object.values(item).forEach(value => {
                html += `<td>${value}</td>`;
            });
            html += '</tr>';
        });
    } else {
        html += '<tr><td colspan="100%">No data available</td></tr>';
    }
    html += '</table></body>';
    return html;
}

app.get('/fetch-and-store', async (req, res) => {
    try {
        const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
        const temp = response.data;
        const objData = JSON.parse(JSON.stringify(temp));
        const top10 = Object.keys(objData).slice(0, 10).map(key => objData[key]);
        let data = top10;
        db.query('Delete  FROM tickers', (error, results) => {
            
        });
        // Store data in MySQL
        await Promise.all(data.map(async (item) => {
            await db.query(
                `INSERT INTO tickers (name, last, buy, sell, volume, base_unit) VALUES (?, ?, ?, ?, ?, ?)`,
                [item.name, item.last, item.buy, item.sell, item.volume, item.base_unit]
            );
        }));

        // Fetch data from MySQL after storing
        db.query('SELECT name,last,buy,sell,volume,base_unit FROM tickers', (error, results) => {
            if (error) {
                console.error('Error fetching data from MySQL:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            const css = `
                body {
                    font-family: Arial, sans-serif;
                    background-color: #2c2c2c;
                    color: white;
                    margin: 0;
                    padding: 0;
                }
                header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    background-color: #1a1a1a;
                }
                h1 {
                    font-size: 24px;
                    margin: 0;
                }
                p {
                    font-size: 14px;
                    margin: 0;
                }
                button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    cursor: pointer;
                }
                .price-info {
                    padding: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #444;
                }
            `;
            const htmlTable = generateHTMLTable(results, css);

            // Writing HTML to a file
            const outputPath = path.join(__dirname, 'public', 'index.html');
            fs.writeFileSync(outputPath, htmlTable, 'utf8');
            console.log('HTML file generated successfully!');
            // Redirect after writing HTML to file
            res.sendFile(outputPath);
        });
    } catch (error) {
        console.error('Error fetching and storing data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => console.log(`Server is up and running on port ${port}`));
