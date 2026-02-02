import LanguageTabs from "./components/LanguageTabs";

function App() {
  // Remove all server detection logic - localStorage is always available
  return (
    <div className="min-h-screen bg-blue-100">
      <LanguageTabs />
    </div>
  );
}

export default App;
