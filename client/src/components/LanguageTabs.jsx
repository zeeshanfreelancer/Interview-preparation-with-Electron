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
  FiMoreHorizontal,
  FiDownload,
  FiUpload
} from "react-icons/fi";
import QuestionBoard from "./QuestionBoard";
import { apiService } from "../services/api";
import { exportToPDF, exportToWord, exportToJSON, importFromJSON } from "../utils/exportImport";

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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportOptionsOpen, setExportOptionsOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [allLanguagesQuestions, setAllLanguagesQuestions] = useState({});
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Load languages from API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoading(true);
        const startTime = Date.now();
        const fetchedLanguages = await apiService.getLanguages();
        // Ensure we have at least React as default
        const defaultLanguages = fetchedLanguages.length > 0 ? fetchedLanguages : ['React'];
        setLanguages(defaultLanguages);
        setActiveLang(defaultLanguages[0]);
        setError(null);
        
        // Ensure loader shows for at least 2 seconds
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsedTime);
        
        setTimeout(() => {
          setLoading(false);
        }, remainingTime);
      } catch (err) {
        console.error('Failed to load languages:', err);
        // Fallback to default languages if API fails
        const defaultLanguages = ['React', 'HTML', 'CSS', 'JavaScript'];
        setLanguages(defaultLanguages);
        setActiveLang(defaultLanguages[0]);
        setError('Failed to load languages from server');
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };

    loadLanguages();
  }, []);

  // Load questions when language changes
  useEffect(() => {
    const loadQuestions = async () => {
      if (!activeLang) return;
      try {
        setLoading(true);
        const startTime = Date.now();
        const fetchedQuestions = await apiService.getQuestions(activeLang);
        setQuestions(fetchedQuestions);
        
        // Ensure loader shows for at least 2 seconds
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsedTime);
        
        setTimeout(() => {
          setLoading(false);
        }, remainingTime);
      } catch (err) {
        console.error('Failed to load questions:', err);
        setQuestions([]);
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      }
    };

    loadQuestions();
  }, [activeLang]);

  const addLanguage = () => {
    if (!newLanguage.trim() || languages.includes(newLanguage.trim())) return;

    setLanguages([...languages, newLanguage.trim()]);
    setNewLanguage("");
  };

  const deleteLanguage = async (langToDelete) => {
    if (languages.length <= 1) return; // Keep at least one language

    try {
      await apiService.deleteLanguage(langToDelete);
      
      const newLanguages = languages.filter(lang => lang !== langToDelete);
      setLanguages(newLanguages);

      // If deleting active language, switch to first remaining language
      if (activeLang === langToDelete) {
        setActiveLang(newLanguages[0]);
      }

      setSearchTerm(""); // Clear search when switching languages
    } catch (error) {
      console.error('Failed to delete language:', error);
      alert('Failed to delete language');
    }
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

  const handleExport = (format) => {
    if (questions.length === 0) {
      alert('No questions to export');
      return;
    }
    setSelectedExportFormat(format);
    setExportMenuOpen(false);
    setExportOptionsOpen(true);
  };

  const executeExport = async (scope, format) => {
    let questionsToExport = [];
    let exportName = '';

    if (scope === 'current') {
      questionsToExport = questions;
      exportName = activeLang;
    } else {
      // Load all questions for all languages
      const allQuestions = {};
      for (const lang of languages) {
        try {
          const langQuestions = await apiService.getQuestions(lang);
          if (langQuestions.length > 0) {
            allQuestions[lang] = langQuestions;
          }
        } catch (err) {
          console.error(`Failed to load questions for ${lang}:`, err);
        }
      }
      
      // Flatten all questions
      questionsToExport = Object.entries(allQuestions).flatMap(([lang, qs]) => 
        qs.map(q => ({ ...q, language: lang }))
      );
      exportName = 'All_Languages';
    }

    if (questionsToExport.length === 0) {
      alert('No questions to export');
      setExportOptionsOpen(false);
      return;
    }

    switch (format) {
      case 'pdf':
        exportToPDF(questionsToExport, exportName, scope === 'all');
        break;
      case 'word':
        exportToWord(questionsToExport, exportName, scope === 'all');
        break;
      case 'json':
        if (scope === 'all') {
          exportToJSON(allQuestions, exportName, true);
        } else {
          exportToJSON(questionsToExport, exportName);
        }
        break;
    }
    setExportOptionsOpen(false);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = await importFromJSON(file);
      
      // Import questions to current language
      for (const q of data.questions) {
        await apiService.createQuestion({
          language: activeLang,
          question: q.question,
          answer: q.answer
        });
      }
      
      // Reload questions
      const updatedQuestions = await apiService.getQuestions(activeLang);
      setQuestions(updatedQuestions);
      
      alert(`Successfully imported ${data.questions.length} questions`);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLang(null);
    setEditingValue("");
  };

  // Close export menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
        setExportOptionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    <div className="max-w-6xl mx-auto">

      {/* Tabs and Menu */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 py-2">
        <div className="max-w-6xl mx-auto flex justify-center items-center gap-4 px-4">
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

        {/* Export Button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md hover:shadow-lg cursor-pointer"
            title="Export questions"
          >
            <FiDownload className="inline mr-2" /> Export
          </button>
          {exportMenuOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-t-lg cursor-pointer"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('word')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 cursor-pointer"
              >
                Word
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-b-lg cursor-pointer"
              >
                JSON
              </button>
            </div>
          )}
          {exportOptionsOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
              <div className="p-1 border-b border-gray-200">
                
                <button
                  onClick={() => executeExport('current', selectedExportFormat)}
                  className="w-full px-1 py-2 text-center hover:bg-gray-50 rounded text-sm cursor-pointer"
                >
                  Current Language
                </button>
                <button
                  onClick={() => executeExport('all', selectedExportFormat)}
                  className="w-full px-1 py-2 text-center hover:bg-gray-50 rounded text-sm cursor-pointer"
                >
                  All Languages
                </button>
              </div>
              <button
                onClick={() => setExportOptionsOpen(false)}
                className="w-full px-1 py-2 text-center hover:bg-gray-50 rounded-b-lg text-sm text-gray-500 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Import Button */}
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors shadow-md hover:shadow-lg cursor-pointer"
          title="Import questions from JSON"
        >
          <FiUpload className="inline mr-2" /> Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />

        {/* Search Icon */}
        <button
          onClick={() => {
            const newVisibility = !searchVisible;
            setSearchVisible(newVisibility);
            if (!newVisibility) {
              setSearchTerm(""); // Clear search when hiding
            }
          }}
          className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          title="Toggle search"
        >
          <FiSearch size={20} />
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
      </div>

      {/* Content with top padding */}
      <div className="pt-16">

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
          onQuestionsUpdate={setQuestions}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default LanguageTabs;
