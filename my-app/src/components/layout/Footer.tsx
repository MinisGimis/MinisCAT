import React from "react";
import { Button, Box } from "@mui/material";
import { useAppContext } from "../../contexts/AppContext";

const Footer: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { chapters, selectedChapter } = state;

  const handlePrevious = () => {
    if (selectedChapter !== null && selectedChapter > 0) {
      dispatch({ type: "SET_SELECTED_CHAPTER", payload: selectedChapter - 1 });
    }
  };

  const handleNext = () => {
    if (selectedChapter !== null && selectedChapter < chapters.length - 1) {
      dispatch({ type: "SET_SELECTED_CHAPTER", payload: selectedChapter + 1 });
    }
  };

  const isFirstChapter = selectedChapter === 0;
  const isLastChapter = selectedChapter === chapters.length - 1;

  return (
    <div className="footer">
      <Button
        variant="contained"
        onClick={handlePrevious}
        disabled={isFirstChapter}
        className="nav-button"
      >
        Previous
      </Button>

      <Box sx={{ display: "flex", gap: 1 }}>
        <span>
          Chapter {selectedChapter !== null ? selectedChapter + 1 : 0} of{" "}
          {chapters.length}
        </span>
      </Box>

      <Button
        variant="contained"
        onClick={handleNext}
        disabled={isLastChapter}
        className="nav-button"
      >
        Next
      </Button>
    </div>
  );
};

export default Footer;
