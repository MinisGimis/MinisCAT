import React from "react";
import { Box, Modal, Typography, Button, Divider } from "@mui/material";
import { useAppContext } from "../../contexts/AppContext";

interface ClearTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ClearTranslationModal: React.FC<ClearTranslationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { state, dispatch } = useAppContext();

  const handleClearCurrentChapter = () => {
    if (state.selectedChapter !== null) {
      dispatch({
        type: "CLEAR_CHAPTER_TRANSLATION",
        payload: state.selectedChapter,
      });
    }
    onClose();
  };

  const handleClearAllTranslations = () => {
    dispatch({ type: "CLEAR_ALL_TRANSLATIONS", payload: undefined });
    onClose();
  };

  const hasCurrentChapterTranslation =
    state.selectedChapter !== null && state.translations[state.selectedChapter];

  const hasAnyTranslations = Object.keys(state.translations).length > 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="clear-translation-modal-title"
      aria-describedby="clear-translation-modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography
          id="clear-translation-modal-title"
          variant="h6"
          component="h2"
          gutterBottom
        >
          Clear Translation Options
        </Typography>
        <Typography id="clear-translation-modal-description" sx={{ mb: 3 }}>
          Choose an option to clear translations:
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleClearCurrentChapter}
            disabled={!hasCurrentChapterTranslation}
            fullWidth
          >
            Clear This Chapter Only
            {!hasCurrentChapterTranslation &&
              " (No translation for current chapter)"}
          </Button>

          <Divider />

          <Button
            variant="outlined"
            color="error"
            onClick={handleClearAllTranslations}
            disabled={!hasAnyTranslations}
            fullWidth
          >
            Clear All Translations
            {!hasAnyTranslations && " (No translations to clear)"}
          </Button>
        </Box>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ClearTranslationModal;
