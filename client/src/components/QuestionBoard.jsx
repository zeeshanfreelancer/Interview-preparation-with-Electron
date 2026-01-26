import { useState, useEffect } from "react";
import {
  FiEye,
  FiEyeOff,
  FiMoreHorizontal,
  FiX,
  FiTrash2,
  FiCheck,
  FiPlus
} from "react-icons/fi";
import { apiService } from "../services/api";

export default function QuestionBoard({
  language,
  searchTerm,
  languages,
  questionModalOpen,
  selectedQuestionId,
  editingQuestionText,
  editingAnswerText,
  onOpenQuestionModal,
  onCloseQuestionModal,
  onSetEditingQuestionText,
  onSetEditingAnswerText
}) {
  const [answersVisible, setAnswersVisible] = useState({});
  const [questions, setQuestions] = useState({});
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load questions from API when language changes
  useEffect(() => {
    const loadQuestions = async () => {
      if (!language) return;

      try {
        setLoading(true);
        setError(null);
        const fetchedQuestions = await apiService.getQuestions(language);
        setQuestions({ [language]: fetchedQuestions });
        setFilteredQuestions(fetchedQuestions);
      } catch (err) {
        console.error('Failed to load questions:', err);
        setError('Failed to load questions');
        setQuestions({ [language]: [] });
        setFilteredQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [language]);

  // Filter questions based on search term
  useEffect(() => {
    if (!questions[language]) return;

    if (searchTerm.trim()) {
      const filtered = questions[language].filter(q =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredQuestions(filtered);
    } else {
      setFilteredQuestions(questions[language]);
    }
  }, [searchTerm, questions, language]);




  const deleteQuestion = (id) => {
    setQuestions({
      ...questions,
      [language]: (questions[language] || []).filter((q) => q.id !== id),
    });
  };


  const openQuestionModalForEdit = (questionId) => {
    onOpenQuestionModal(questionId);
    // Set initial values for editing
    if (questionId) {
      const question = (questions[language] || []).find(q => (q._id || q.id) === questionId);
      if (question) {
        onSetEditingQuestionText(question.question);
        onSetEditingAnswerText(question.answer);
      }
    }
  };

  const saveQuestionChanges = async () => {
    if (!editingQuestionText.trim()) return;

    try {
      if (selectedQuestionId) {
        // Update existing question
        await apiService.updateQuestion(selectedQuestionId, {
          question: editingQuestionText.trim(),
          answer: editingAnswerText
        });
      } else {
        // Add new question
        await apiService.createQuestion({
          language,
          question: editingQuestionText.trim(),
          answer: editingAnswerText
        });
      }

      // Reload questions after save
      const updatedQuestions = await apiService.getQuestions(language);
      setQuestions({ [language]: updatedQuestions });
      setFilteredQuestions(updatedQuestions);

      onCloseQuestionModal();
    } catch (err) {
      console.error('Failed to save question:', err);
      setError('Failed to save question');
    }
  };

  const deleteQuestionAndAnswer = async () => {
    try {
      await apiService.deleteQuestion(selectedQuestionId);

      // Reload questions after delete
      const updatedQuestions = await apiService.getQuestions(language);
      setQuestions({ [language]: updatedQuestions });
      setFilteredQuestions(updatedQuestions);

      onCloseQuestionModal();
    } catch (err) {
      console.error('Failed to delete question:', err);
      setError('Failed to delete question');
    }
  };



  if (loading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 m-7">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading questions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 m-7">
        <div className="flex justify-center items-center py-12">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-6 m-7">

      {(questions[language] || []).length === 0 && (
        <p className="text-gray-500 text-center mb-4">
          No questions yet. Add one!
        </p>
      )}

      {/* Questions List */}
      {filteredQuestions.map((q, index) => (
        <div
          key={q._id || q.id}
          className="border rounded-xl p-4 mb-4 hover:shadow-md transition"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold flex-1">
              Q{index + 1}: {q.question}
            </h3>

            <div className="flex gap-1">
              <button
                onClick={() => setAnswersVisible(prev => ({
                  ...prev,
                  [q._id || q.id]: prev[q._id || q.id] === undefined ? false : !prev[q._id || q.id]
                }))}
                className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                title={(answersVisible[q._id || q.id] ?? true) ? "Hide answers" : "Show answers"}
              >
                {(answersVisible[q._id || q.id] ?? true) ? <FiEye /> : <FiEyeOff />}
              </button>
              <button
                onClick={() => openQuestionModalForEdit(q._id || q.id)}
                className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                title="Question options"
              >
                <FiMoreHorizontal />
              </button>
            </div>
          </div>

          {(answersVisible[q._id || q.id] ?? true) && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border min-h-[60px]">
              {q.answer || <span className="text-gray-400 italic">No answer yet...</span>}
            </div>
          )}
        </div>
      ))}



      {filteredQuestions.length === 0 && searchTerm && (questions[language] || []).length > 0 && (
  <p className="text-center text-gray-500 mt-6">
    No questions found
  </p>
)}

      {/* Question Management Modal */}
      {questionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onCloseQuestionModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedQuestionId ? 'Manage Question' : 'Add New Question'}
              </h2>
              <button onClick={onCloseQuestionModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer">
                <FiX />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Question Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Question</label>
                <input
                  type="text"
                  value={editingQuestionText}
                  onChange={(e) => onSetEditingQuestionText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Enter your question..."
                />
              </div>

              {/* Answer Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Answer</label>
                <textarea
                  value={editingAnswerText}
                  onChange={(e) => onSetEditingAnswerText(e.target.value)}
                  className="w-full min-h-[120px] px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Write your answer..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={selectedQuestionId ? "flex justify-between p-6 border-t border-gray-200" : "flex justify-end p-6 border-t border-gray-200"}>
              {selectedQuestionId && (
                <button onClick={deleteQuestionAndAnswer} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors cursor-pointer">
                  <FiTrash2 className="inline mr-2" /> Delete Question
                </button>
              )}
              <div className="flex gap-3">
                <button onClick={onCloseQuestionModal} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={saveQuestionChanges} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors cursor-pointer">
                  {selectedQuestionId ? <><FiCheck className="inline mr-2" /> Save Changes</> : <><FiCheck className="inline mr-2" /> Add Question</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
