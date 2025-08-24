const subjectInput = document.getElementById("subjectInput");
const examDateInput = document.getElementById("examDateInput");
const studyHoursInput = document.getElementById("studyHoursInput");
const generatePlanBtn = document.getElementById("generatePlanBtn");
const planOutput = document.getElementById("planOutput");
const downloadPDFBtn = document.getElementById("downloadPDFBtn");

// AI: Generate Study Plan
generatePlanBtn.addEventListener("click", async () => {
  const subject = subjectInput.value.trim();
  const examDate = examDateInput.value;
  const hours = studyHoursInput.value;

  if (!subject || !examDate || !hours) {
    alert("Please fill in all fields!");
    return;
  }

  planOutput.textContent = "⏳ Generating your personalized study plan...";
  downloadPDFBtn.style.display = "none";

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer gsk_YOUR_API_KEY", // Replace with your Groq key
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content:
                "You are a study coach. Create a personalized daily study schedule until the exam date.",
            },
            {
              role: "user",
              content: `Subject: ${subject}, Exam Date: ${examDate}, Daily Study Hours: ${hours}.
            Create a structured plan with daily tasks and focus areas.`,
            },
          ],
          max_tokens: 500,
        }),
      }
    );

    const data = await response.json();
    const plan = data.choices[0].message.content;

    planOutput.textContent = plan;
    downloadPDFBtn.style.display = "inline-block"; // show download button
  } catch (error) {
    console.error(error);
    planOutput.textContent = "❌ Failed to generate study plan.";
  }
});

// 📄 Download as PDF
downloadPDFBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const planText = planOutput.textContent;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("📅 AI Study Plan", 10, 20);
  doc.setFontSize(12);

  // split into multiple lines so text doesn't overflow
  const lines = doc.splitTextToSize(planText, 180);
  doc.text(lines, 10, 30);

  // save file
  doc.save("StudyPlan.pdf");
});
