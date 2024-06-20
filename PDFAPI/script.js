const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const outputDirectory = '/home/ubuntu/FinalProject/KYC-verification-using-Blockchain/PDFAPI/pdf_output';

// Function to create a PDF document for a KYC form
async function createKYCFormPDF(kycData) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Add a page to the document
  const page = pdfDoc.addPage([600, 700]);

  // Define the font size
  const fontSize = 12;

  // Function to draw text on the PDF
  const drawText = (text, x, y) => {
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font: timesRomanFont,
    });
  };

  // Add the KYC data to the PDF
  let y = 650;
  drawText(`KYC Form: ${kycData.name}`, 50, y); y -= 20;
  drawText(`Owner: ${kycData.owner}`, 50, y); y -= 20;
  drawText(`Created: ${kycData.creation}`, 50, y); y -= 20;
  drawText(`Modified: ${kycData.modified}`, 50, y); y -= 20;
  drawText(`Full Name: ${kycData.full_name}`, 50, y); y -= 20;
  drawText(`Gender: ${kycData.gender}`, 50, y); y -= 20;
  drawText(`Date of Birth: ${kycData.date_of_birth}`, 50, y); y -= 20;
  drawText(`Citizenship No: ${kycData.citizenship_no}`, 50, y); y -= 20;
  drawText(`Phone No: ${kycData.phone_no}`, 50, y); y -= 20;
  drawText(`Email: ${kycData.email}`, 50, y); y -= 20;
  drawText(`Address: ${kycData.house_no}, ${kycData.streettole}, ${kycData.ward_no}, ${kycData.district}, ${kycData.province}`, 50, y); y -= 20;
  drawText(`Occupation: ${kycData.select_the_occupation}`, 50, y); y -= 20;
  drawText(`Nature of Business: ${kycData.nature_of_business}`, 50, y); y -= 20;

  // Check if there is any table data
  if (kycData.table_rrla9.length > 0) {
    y -= 20;
    drawText('Work Details:', 50, y); y -= 20;

    kycData.table_rrla9.forEach((work, index) => {
      drawText(`Institution ${index + 1}: ${work.institution_name}`, 70, y); y -= 20;
      drawText(`Address: ${work.address}`, 70, y); y -= 20;
      drawText(`Designation: ${work.designation}`, 70, y); y -= 20;
      drawText(`Anticipated Annual Income: ${work.anticipated_annual_income}`, 70, y); y -= 20;
    });
  }

  // Return the PDF document
  return pdfDoc;
}

// Function to fetch KYC data from the API and generate PDFs
async function fetchAndCreatePDFs() {
  try {
    const response = await axios.get('http://202.51.82.246:85/api/method/getallkyc');
    const kycForms = response.data.Data;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    // Loop through each KYC form and create a PDF
    for (const form of kycForms) {
      const kycData = form['KYC Form'];
      const fileName = `${kycData.name}.pdf`;
      const filePath = path.join(outputDirectory, fileName);
      const pdfDoc = await createKYCFormPDF(kycData);
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(filePath, pdfBytes);
      console.log(`Created PDF: ${filePath}`);
    }
  } catch (error) {
    console.error('Error fetching KYC data:', error);
  }
}

// Run the function to fetch data and create PDFs
fetchAndCreatePDFs();

