import { useState } from "react";
import QuestionBoard from "./QuestionBoard";

const languages = ["React", "HTML", "CSS", "JavaScript"];

function LanguageTabs() {
  const [activeLang, setActiveLang] = useState("React");
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="max-w-4xl mx-auto py-10">
      {/* Heading */}
      <h1 className="text-4xl font-bold text-center text-purple-600">
        Question Manager
      </h1>
      <p className="text-center text-gray-500 mt-2">
        Organize your frontend interview prep
      </p>

      {/* Tabs */}
      <div className="flex justify-center mt-8">
        <div className="bg-purple-100 p-2 rounded-full flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setActiveLang(lang);
                setSearchTerm(""); // language change pe search reset
              }}
              className={`px-6 py-2 rounded-full font-medium transition ${
                activeLang === lang
                  ? "bg-white text-purple-600 shadow"
                  : "text-gray-600"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* 🔍 Search Box */}
      <div className="mt-6 flex justify-center">
        <input
          type="text"
          placeholder={`Search ${activeLang} questions...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Question Board */}
      <QuestionBoard
        language={activeLang}
        searchTerm={searchTerm}
      />
    </div>
  );
}

export default LanguageTabs;
