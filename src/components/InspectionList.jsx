import React from "react";

const InspectionList = ({ inspectionList, handleCheckHydrant }) => {  // 🔥 受け取るように修正
    console.log("📌 handleCheckHydrant (InspectionList):", handleCheckHydrant);  // 確認用ログ

    const formatAddress = (address) => {
        if (address.includes("伊勢原市")) {
            return address.split("伊勢原市")[1].trim();
        }
        return address;
    };

    const hydrants = inspectionList.filter(item => item.type === "消火栓");
    const tanks = inspectionList.filter(item => item.type === "水そう");

    return (
        <div className="inspection-list">
            <h2>✔️ 点検済みリスト</h2>
            
            <div>
                <h3>🚒 消火栓</h3>
                <ul>
                    {hydrants.map((item, index) => (
                        <li key={index} onClick={() => handleCheckHydrant(item.firestoreId)}>
                            消火栓：{formatAddress(item.address)}
                        </li>
                    ))}
                </ul>
            </div>

            <div>
                <h3>💧 水そう</h3>
                <ul>
                    {tanks.map((item, index) => (
                        <li key={index} onClick={() => handleCheckHydrant(item.firestoreId)}>
                            水そう：{formatAddress(item.address)}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default InspectionList;
