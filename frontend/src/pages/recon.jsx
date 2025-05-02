import React, { useState } from "react";
import axios from "axios";

function Recon() {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post("http://localhost:5000/api/recon/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setData(response.data.data);
        } catch (err) {
            console.error("Upload Error:", err);
        }
    };

    return (
        <div>
            <h1>Recon Page</h1>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload PDF</button>
            <div>
                <h3>Extracted Data:</h3>
                <ul>
                    {data.map((item, index) => (
                        <li key={index}>
                            {item.tenantId} - {item.name}: {item.details}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default Recon;
