import React, { useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import { useAppContext } from "../../contexts/AppContext";
import SettingsMenu from "../ui/SettingsMenu";
import "../../styles/App.css";
import GlossaryModal from "../ui/GlossaryModal";
import Typography from "@mui/material/Typography";

interface HeaderProps {
  onFileUpload?: (file: File) => void;
}

const Header: React.FC<HeaderProps> = ({ onFileUpload }) => {
  const { state } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    e.target.value = "";
  };

  const novelTitle =
    state.chapters[state.selectedChapter || 0]?.title || "Select a Chapter";
  const chaptersCount = state.chapters.length;

  return (
    <div className="header">
      <div className="settings-container">
        <IconButton
          aria-label="settings"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          size="large"
        >
          <SettingsIcon fontSize="large" />
        </IconButton>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setIsGlossaryOpen(true)}
          sx={{ ml: 2 }}
        >
          Glossary
        </Button>
        {isSettingsOpen && (
          <SettingsMenu
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
        {isGlossaryOpen && (
          <GlossaryModal
            isOpen={isGlossaryOpen}
            onClose={() => setIsGlossaryOpen(false)}
          />
        )}
      </div>
      {chaptersCount > 0 ? (
        <div className="dynamic-header">
          <h1 className="chapter-title">{novelTitle}</h1>
        </div>
      ) : (
        <div className="upload-container">
          <h1>Upload a Novel</h1>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>
      )}
    </div>
  );
};

export default Header;
