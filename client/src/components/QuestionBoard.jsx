import { useState } from "react";

export default function QuestionBoard({ language, searchTerm }) {
  const [questions, setQuestions] = useState({
    React: [
      {
        id: 1,
        question: "What is React?",
        answer: "",
        show: false,
      },
    ],
    HTML: [],
    CSS: [],
    JavaScript: [],
  });

  const [newQuestion, setNewQuestion] = useState("");
  const [showInput, setShowInput] = useState(false);

  const toggleAnswer = (id) => {
    setQuestions({
      ...questions,
      [language]: questions[language].map((q) =>
        q.id === id ? { ...q, show: !q.show } : q
      ),
    });
  };

  const deleteQuestion = (id) => {
    setQuestions({
      ...questions,
      [language]: questions[language].filter((q) => q.id !== id),
    });
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;

    setQuestions({
      ...questions,
      [language]: [
        ...questions[language],
        {
          id: Date.now(),
          question: newQuestion,
          answer: "",
          show: false,
        },
      ],
    });

    setNewQuestion("");
    setShowInput(false);
  };
  const filteredQuestions = questions[language].filter((q) =>
  q.question.toLowerCase().includes(searchTerm.toLowerCase())
);


  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 m-7">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        {language} Questions
      </h2>

      {questions[language].length === 0 && (
        <p className="text-gray-500 text-center mb-4">
          No questions yet. Add one!
        </p>
      )}

      {/* Questions List */}
      {filteredQuestions.map((q, index) => (
        <div
          key={q.id}
          className="border rounded-xl p-4 mb-4 hover:shadow-md transition"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold">
              Q{index + 1}: {q.question}
            </h3>

            <button
              onClick={() => deleteQuestion(q.id)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✖
            </button>
          </div>

          <button
            onClick={() => toggleAnswer(q.id)}
            className="text-blue-600 font-medium mt-2"
          >
            {q.show ? "Hide Answer ▲" : "Show Answer ▼"}
          </button>

          {q.show && (
            <textarea
              value={q.answer}
              onChange={(e) => {
                setQuestions({
                  ...questions,
                  [language]: questions[language].map((item) =>
                    item.id === q.id
                      ? { ...item, answer: e.target.value }
                      : item
                  ),
                });
              }}
              className="w-full min-h-[120px] p-3 border rounded-lg resize-y mt-3"
              placeholder="Write or edit your answer..."
            />
          )}
        </div>
      ))}

      {/* Add Question Input */}
      {showInput && (
        <div className="mb-4">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Enter your question..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="flex gap-3 mt-2">
            <button
              onClick={addQuestion}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>

            <button
              onClick={() => {
                setShowInput(false);
                setNewQuestion("");
              }}
              className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ➕ Add Question Button */}
      <button
        onClick={() => setShowInput(true)}
        className="w-full py-3 mt-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
      >
        ➕ Add Question
      </button>

      {filteredQuestions.length === 0 && searchTerm && (
  <p className="text-center text-gray-500 mt-6">
    No questions found
  </p>
)}

    </div>
  );
}
