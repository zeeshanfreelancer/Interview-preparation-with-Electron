import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export const exportToPDF = (questions, exportName, isMultiLanguage = false) => {
  const pdf = new jsPDF();
  const pageHeight = pdf.internal.pageSize.height;
  let yPosition = 20;
  
  // Title
  pdf.setFontSize(18);
  pdf.text(`${exportName} Questions & Answers`, 20, yPosition);
  yPosition += 20;
  
  if (isMultiLanguage) {
    // Group questions by language
    const groupedQuestions = questions.reduce((acc, q) => {
      if (!acc[q.language]) acc[q.language] = [];
      acc[q.language].push(q);
      return acc;
    }, {});
    
    Object.entries(groupedQuestions).forEach(([language, langQuestions]) => {
      // Language header
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${language}`, 20, yPosition);
      yPosition += 15;
      
      langQuestions.forEach((q, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Question
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        const questionText = `Q${index + 1}: ${stripHtml(q.question)}`;
        const questionLines = pdf.splitTextToSize(questionText, 170);
        pdf.text(questionLines, 20, yPosition);
        yPosition += questionLines.length * 7;
        
        // Answer
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(12);
        const answerText = stripHtml(q.answer) || 'No answer provided';
        const answerLines = pdf.splitTextToSize(answerText, 170);
        pdf.text(answerLines, 20, yPosition);
        yPosition += answerLines.length * 6 + 10;
      });
      
      yPosition += 10; // Extra space between languages
    });
  } else {
    questions.forEach((q, index) => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Question
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      const questionText = `Q${index + 1}: ${stripHtml(q.question)}`;
      const questionLines = pdf.splitTextToSize(questionText, 170);
      pdf.text(questionLines, 20, yPosition);
      yPosition += questionLines.length * 7;
      
      // Answer
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(12);
      const answerText = stripHtml(q.answer) || 'No answer provided';
      const answerLines = pdf.splitTextToSize(answerText, 170);
      pdf.text(answerLines, 20, yPosition);
      yPosition += answerLines.length * 6 + 10;
    });
  }
  
  pdf.save(`${exportName}_questions.pdf`);
};

export const exportToWord = async (questions, exportName, isMultiLanguage = false) => {
  let children = [
    new Paragraph({
      text: `${exportName} Questions & Answers`,
      heading: HeadingLevel.TITLE,
    }),
  ];
  
  if (isMultiLanguage) {
    // Group questions by language
    const groupedQuestions = questions.reduce((acc, q) => {
      if (!acc[q.language]) acc[q.language] = [];
      acc[q.language].push(q);
      return acc;
    }, {});
    
    Object.entries(groupedQuestions).forEach(([language, langQuestions]) => {
      children.push(
        new Paragraph({
          text: language,
          heading: HeadingLevel.HEADING_1,
        })
      );
      
      langQuestions.forEach((q, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Q${index + 1}: ${stripHtml(q.question)}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: stripHtml(q.answer) || 'No answer provided',
              }),
            ],
          }),
          new Paragraph({ text: '' }) // Empty line
        );
      });
    });
  } else {
    children.push(
      ...questions.flatMap((q, index) => [
        new Paragraph({
          children: [
            new TextRun({
              text: `Q${index + 1}: ${stripHtml(q.question)}`,
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: stripHtml(q.answer) || 'No answer provided',
            }),
          ],
        }),
        new Paragraph({ text: '' }), // Empty line
      ])
    );
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${exportName}_questions.docx`);
};

export const exportToJSON = (data, exportName, isMultiLanguage = false) => {
  let exportData;
  
  if (isMultiLanguage) {
    exportData = {
      exportDate: new Date().toISOString(),
      languages: data,
    };
  } else {
    exportData = {
      language: exportName,
      exportDate: new Date().toISOString(),
      questions: data.map(q => ({
        question: q.question,
        answer: q.answer,
      })),
    };
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  saveAs(blob, `${exportName}_questions.json`);
};

export const importFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.questions && Array.isArray(data.questions)) {
          resolve(data);
        } else {
          reject(new Error('Invalid JSON format'));
        }
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Helper function to strip HTML tags
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};