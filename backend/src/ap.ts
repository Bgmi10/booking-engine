import axios from "axios";

// Define the payload
const payload = {
  catId: 2,
  buildId: 1,
  subId: 3,
  noOfPeople: 1,
  fromDate: "2025-08-02",
  toDate: "2025-08-02",
  userName: "Subash Chandra Bose",
  userMobile: "7845442450",
  slots: [8],
};

// Define async function to call the external API
const callSaveInTemp = async () => {
  try {
    const response = await axios.post(
      "https://gccservices.chennaicorporation.gov.in/muthalvarpadaippagam/book/api/saveInTemp",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Response:", response.data);
  } catch (error: any) {
    console.error("❌ Proxy Error:", error.response?.data || error.message);
  }
};

// Immediately invoke
callSaveInTemp();
