import { useState, useEffect, useRef } from "react";
import {
  FiSearch,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiPlus,
  FiMoreHorizontal
} from "react-icons/fi";
import QuestionBoard from "./QuestionBoard";
import { apiService } from "../services/api";

function LanguageTabs() {
  const [languages, setLanguages] = useState([]);
  const [activeLang, setActiveLang] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [newLanguage, setNewLanguage] = useState("");
  const [editingLang, setEditingLang] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [editingAnswerText, setEditingAnswerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  // Load languages from API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoading(true);
        const fetchedLanguages = await apiService.getLanguages();
        // Ensure we have at least React as default
        const defaultLanguages = fetchedLanguages.length > 0 ? fetchedLanguages : ['React'];
        setLanguages(defaultLanguages);
        setActiveLang(defaultLanguages[0]);
        setError(null);
      } catch (err) {
        console.error('Failed to load languages:', err);
        // Fallback to default languages if API fails
        const defaultLanguages = ['React', 'HTML', 'CSS', 'JavaScript'];
        setLanguages(defaultLanguages);
        setActiveLang(defaultLanguages[0]);
        setError('Failed to load languages from server');
      } finally {
        setLoading(false);
      }
    };

    loadLanguages();
  }, []);

  const addLanguage = () => {
    if (!newLanguage.trim() || languages.includes(newLanguage.trim())) return;

    setLanguages([...languages, newLanguage.trim()]);
    setNewLanguage("");
  };

  const deleteLanguage = (langToDelete) => {
    if (languages.length <= 1) return; // Keep at least one language

    const newLanguages = languages.filter(lang => lang !== langToDelete);
    setLanguages(newLanguages);

    // If deleting active language, switch to first remaining language
    if (activeLang === langToDelete) {
      setActiveLang(newLanguages[0]);
    }

    setSearchTerm(""); // Clear search when switching languages
  };

  const startEditing = (lang) => {
    setEditingLang(lang);
    setEditingValue(lang);
  };

  const saveEdit = () => {
    if (!editingValue.trim() || languages.includes(editingValue.trim())) {
      setEditingLang(null);
      setEditingValue("");
      return;
    }

    const newLanguages = languages.map(lang =>
      lang === editingLang ? editingValue.trim() : lang
    );
    setLanguages(newLanguages);

    // Update active language if it was renamed
    if (activeLang === editingLang) {
      setActiveLang(editingValue.trim());
    }

    setEditingLang(null);
    setEditingValue("");
  };

  const cancelEdit = () => {
    setEditingLang(null);
    setEditingValue("");
  };

  const openQuestionModal = (questionId, mode = 'add') => {
    setSelectedQuestionId(questionId);
    setQuestionModalOpen(true);

    // Set initial values
    if (questionId) {
      // This will be handled by QuestionBoard since it has the questions data
    } else {
      // Adding new question
      setEditingQuestionText("");
      setEditingAnswerText("");
    }
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    setSelectedQuestionId(null);
    setEditingQuestionText("");
    setEditingAnswerText("");
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLang(null);
    setEditingValue("");
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    if (modalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalOpen]);

  // Close question modal with Escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && questionModalOpen) {
        closeQuestionModal();
      }
    };

    if (questionModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [questionModalOpen]);

  return (
    <div className="max-w-6xl mx-auto py-10">

      {/* Tabs and Menu */}
      <div className="flex justify-center items-center gap-4">
        <div className="bg-purple-100 p-2 rounded-full flex gap-2 flex-wrap">
          {languages.map((lang) => (
            <div key={lang} className="flex items-center">
              {editingLang === lang ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    className="px-3 py-1 text-sm border rounded-full focus:outline-none focus:ring-1 focus:ring-purple-400"
                    autoFocus
                  />
                  <button
                    onClick={saveEdit}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer"
                  >
                    <FiCheck />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 cursor-pointer"
                  >
                    <FiX />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setActiveLang(lang);
                    setSearchTerm(""); // language change pe search reset
                  }}
                  className={`px-6 py-2 rounded-full font-medium transition ${
                    activeLang === lang
                      ? "bg-white text-purple-600 shadow cursor-pointer"
                      : "text-gray-600 cursor-pointer"
                  }`}
                >
                  {lang}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <button
          onClick={() => openQuestionModal(null)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md hover:shadow-lg cursor-pointer"
          title="Add new question"
        >
          <FiPlus className="inline mr-2" /> Add Question
        </button>

        {/* Search Icon */}
        <button
          onClick={() => {
            const newVisibility = !searchVisible;
            setSearchVisible(newVisibility);
            if (!newVisibility) {
              setSearchTerm(""); // Clear search when hiding
            }
          }}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          title="Toggle search"
        >
          <FiSearch />
        </button>

        {/* Three-dot Menu */}
        <button
          onClick={openModal}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          title="Manage languages"
        >
          <FiMoreHorizontal />
        </button>
      </div>

      {/* 🔍 Search Box */}
      {searchVisible && (
        <div className="mt-6 flex justify-center animate-in slide-in-from-top-2 duration-300">
          <input
            type="text"
            placeholder={`Search ${activeLang} questions...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            autoFocus
          />
        </div>
      )}

      {/* Language Management Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 max-h-[80vh] flex flex-col"
          >
            {/* Modal Header - Fixed, non-scrollable */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Manage Languages</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close modal"
              >
                <FiX />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Add Language Section */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Add new language..."
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                  <button
                    onClick={addLanguage}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Languages List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Languages ({languages.length})
                </h3>

                {languages.map((lang) => (
                  <div
                    key={lang}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {editingLang === lang ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                          className="flex-1 px-3 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
                          autoFocus
                        />
                        <button
                          onClick={saveEdit}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 cursor-pointer"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`font-medium ${activeLang === lang ? 'text-purple-600' : 'text-gray-700'}`}>
                          {lang}
                          {activeLang === lang && <span className="text-xs text-purple-500 ml-2">(active)</span>}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(lang)}
                            className="px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded text-sm font-medium transition-colors cursor-pointer"
                            title="Edit language"
                          >
                            <FiEdit2 className="inline mr-1" /> Edit
                          </button>
                          {languages.length > 1 && (
                            <button
                              onClick={() => deleteLanguage(lang)}
                              className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-sm font-medium transition-colors cursor-pointer"
                              title="Delete language"
                            >
                              <FiTrash2 className="inline mr-1" /> Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Question Board */}
      <QuestionBoard
        language={activeLang}
        searchTerm={searchTerm}
        languages={languages}
        questionModalOpen={questionModalOpen}
        selectedQuestionId={selectedQuestionId}
        editingQuestionText={editingQuestionText}
        editingAnswerText={editingAnswerText}
        onOpenQuestionModal={openQuestionModal}
        onCloseQuestionModal={closeQuestionModal}
        onSetEditingQuestionText={setEditingQuestionText}
        onSetEditingAnswerText={setEditingAnswerText}
      />
    </div>
  );
}

export default LanguageTabs;
