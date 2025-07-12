import React, { useState } from "react";
import {
  Box,
  Modal,
  Typography,
  Button,
  Divider,
  IconButton,
  TextField,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAppContext } from "../../contexts/AppContext";
import { cleanupGlossary } from "../../services/translationService";
import { useLocalStorage } from "../../hooks/useLocalStorage";

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Gender = "man" | "woman" | "it";

const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();
  const [apiKey] = useLocalStorage("apiKey", "");
  const [editingTermIndex, setEditingTermIndex] = useState<number | null>(null);
  const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editCharName, setEditCharName] = useState("");
  const [editCharTranslation, setEditCharTranslation] = useState("");
  const [editCharGender, setEditCharGender] = useState<Gender>("man");
  const [isCleaningGlossary, setIsCleaningGlossary] = useState(false);

  const handleEditTerm = (index: number) => {
    setEditingTermIndex(index);
    setEditTerm(state.glossary.terms[index].original);
    setEditTranslation(state.glossary.terms[index].translation);
  };

  const handleEditChar = (index: number) => {
    setEditingCharIndex(index);
    setEditCharName(state.glossary.characters[index].original_name);
    setEditCharTranslation(state.glossary.characters[index].translated_name);
    setEditCharGender(state.glossary.characters[index].gender as Gender);
  };

  const handleSaveTerm = () => {
    if (editingTermIndex !== null) {
      const updatedTerms = [...state.glossary.terms];
      updatedTerms[editingTermIndex] = {
        original: editTerm,
        translation: editTranslation,
      };
      dispatch({
        type: "SET_GLOSSARY",
        payload: { ...state.glossary, terms: updatedTerms },
      });
      setEditingTermIndex(null);
    }
  };

  const handleSaveChar = () => {
    if (editingCharIndex !== null) {
      const updatedChars = [...state.glossary.characters];
      updatedChars[editingCharIndex] = {
        original_name: editCharName,
        translated_name: editCharTranslation,
        gender: editCharGender,
      };
      dispatch({
        type: "SET_GLOSSARY",
        payload: { ...state.glossary, characters: updatedChars },
      });
      setEditingCharIndex(null);
    }
  };

  const handleDeleteTerm = (index: number) => {
    const updatedTerms = state.glossary.terms.filter((_, i) => i !== index);
    dispatch({
      type: "SET_GLOSSARY",
      payload: { ...state.glossary, terms: updatedTerms },
    });
  };

  const handleDeleteChar = (index: number) => {
    const updatedChars = state.glossary.characters.filter(
      (_, i) => i !== index
    );
    dispatch({
      type: "SET_GLOSSARY",
      payload: { ...state.glossary, characters: updatedChars },
    });
  };

  const handleDeleteAll = () => {
    dispatch({ type: "SET_GLOSSARY", payload: { terms: [], characters: [] } });
    localStorage.removeItem("glossary");
  };

  const handleCleanupGlossary = async () => {
    if (
      !apiKey ||
      (state.glossary.terms.length === 0 &&
        state.glossary.characters.length === 0)
    ) {
      return;
    }

    setIsCleaningGlossary(true);
    try {
      const cleanedGlossary = await cleanupGlossary(state.glossary, apiKey);
      dispatch({
        type: "SET_GLOSSARY",
        payload: {
          terms: cleanedGlossary.cleaned_terms,
          characters: cleanedGlossary.cleaned_characters,
        },
      });
    } catch (error) {
      console.error("Glossary cleanup failed:", error);
      alert(
        "Glossary cleanup failed. Please check your API key and try again."
      );
    } finally {
      setIsCleaningGlossary(false);
    }
  };

  const handleAddTerm = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && event.currentTarget.value.trim()) {
      const [original, translated] = event.currentTarget.value.split(":");
      if (original && translated) {
        dispatch({
          type: "ADD_GLOSSARY_TERM",
          payload: {
            original: original.trim(),
            translation: translated.trim(),
          },
        });
        event.currentTarget.value = "";
      } else {
        alert('Invalid format. Use "Original:Translated".');
      }
    }
  };

  const handleAddCharacter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && event.currentTarget.value.trim()) {
      const [original, translated, gender] =
        event.currentTarget.value.split(":");
      if (original && translated && gender) {
        const validGender = gender.toLowerCase() as Gender;
        if (
          validGender === "man" ||
          validGender === "woman" ||
          validGender === "it"
        ) {
          dispatch({
            type: "ADD_GLOSSARY_CHARACTER",
            payload: {
              original_name: original.trim(),
              translated_name: translated.trim(),
              gender: validGender,
            },
          });
          event.currentTarget.value = "";
        } else {
          alert('Invalid gender. Use "man", "woman", or "it".');
        }
      } else {
        alert(
          'Invalid format. Use "Original:Translated:Gender". Gender should be "man", "woman", or "it".'
        );
      }
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: { xs: 0, sm: 2 },
          maxWidth: { xs: "100%", sm: 600 },
          width: { xs: "100%", sm: "90%" },
          maxHeight: { xs: "100vh", sm: "90vh" },
          height: { xs: "100vh", sm: "auto" },
          mx: "auto",
          my: { xs: 0, sm: 2 },
          boxShadow: { xs: 0, sm: 24 },
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: { xs: 2, sm: 3 },
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Typography variant="h6">Glossary</Typography>
          <IconButton
            onClick={onClose}
            sx={{
              p: { xs: 1, sm: 1.5 },
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            gap: { xs: 0.5, sm: 1 },
            p: { xs: 1.5, sm: 2 },
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCleanupGlossary}
            disabled={
              isCleaningGlossary ||
              !apiKey ||
              (state.glossary.terms.length === 0 &&
                state.glossary.characters.length === 0)
            }
            startIcon={
              isCleaningGlossary ? <CircularProgress size={16} /> : null
            }
            size="small"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              px: { xs: 1, sm: 2 },
            }}
          >
            {isCleaningGlossary ? "Cleaning..." : "Cleanup"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteAll}
            size="small"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              px: { xs: 1, sm: 2 },
            }}
          >
            Delete All
          </Button>
        </Box>

        {/* Scrollable Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: { xs: 2, sm: 3 },
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.125rem" } }}
          >
            Terms ({state.glossary.terms.length})
          </Typography>
          {state.glossary.terms.length === 0 && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No terms.
            </Typography>
          )}
          {state.glossary.terms.map((term, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.5, sm: 1 },
                mb: 1,
                p: { xs: 1, sm: 1.5 },
                borderRadius: 1,
                "&:hover": { bgcolor: "action.hover" },
                flexWrap: "wrap",
                cursor: editingTermIndex === idx ? "default" : "pointer",
              }}
            >
              {editingTermIndex === idx ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 1, sm: 1 },
                    width: "100%",
                  }}
                >
                  <TextField
                    size="small"
                    value={editTerm}
                    onChange={(e) => setEditTerm(e.target.value)}
                    sx={{
                      width: { xs: "100%", sm: 120 },
                      minWidth: { xs: "auto", sm: 120 },
                    }}
                  />
                  <TextField
                    size="small"
                    value={editTranslation}
                    onChange={(e) => setEditTranslation(e.target.value)}
                    sx={{
                      width: { xs: "100%", sm: 120 },
                      minWidth: { xs: "auto", sm: 120 },
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button size="small" onClick={handleSaveTerm}>
                      Save
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setEditingTermIndex(null)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: { xs: 0.5, sm: 1 },
                    width: "100%",
                  }}
                  onClick={() => handleEditTerm(idx)}
                >
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTerm(idx);
                    }}
                    sx={{
                      p: 0.5,
                      mr: 1,
                      "&:hover": { bgcolor: "error.light" },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Typography
                    sx={{
                      minWidth: { xs: "auto", sm: 120 },
                      flex: { xs: "none", sm: 1 },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    {term.original}
                  </Typography>
                  <Typography
                    sx={{
                      mx: { xs: 0, sm: 1 },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    =&gt;
                  </Typography>
                  <Typography
                    sx={{
                      minWidth: { xs: "auto", sm: 120 },
                      flex: { xs: "none", sm: 1 },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    {term.translation}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}

          {/* Add Term TextField */}
          <TextField
            label="Add Term (Format: Original:Translated)"
            variant="outlined"
            size="small"
            sx={{
              mt: 2,
              mb: 3,
              width: "100%",
              "& .MuiInputBase-input": {
                fontSize: { xs: "0.875rem", sm: "1rem" },
              },
            }}
            onKeyDown={handleAddTerm}
          />

          <Divider sx={{ my: 3 }} />

          <Typography
            variant="subtitle1"
            sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.125rem" } }}
          >
            Characters ({state.glossary.characters.length})
          </Typography>
          {state.glossary.characters.length === 0 && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No characters.
            </Typography>
          )}
          {state.glossary.characters.map((char, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.5, sm: 1 },
                mb: 1,
                p: { xs: 1, sm: 1.5 },
                borderRadius: 1,
                "&:hover": { bgcolor: "action.hover" },
                flexWrap: "wrap",
                cursor: editingCharIndex === idx ? "default" : "pointer",
              }}
            >
              {editingCharIndex === idx ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 1, sm: 1 },
                    width: "100%",
                  }}
                >
                  <TextField
                    size="small"
                    value={editCharName}
                    onChange={(e) => setEditCharName(e.target.value)}
                    sx={{
                      width: { xs: "100%", sm: 120 },
                      minWidth: { xs: "auto", sm: 120 },
                    }}
                  />
                  <TextField
                    size="small"
                    value={editCharTranslation}
                    onChange={(e) => setEditCharTranslation(e.target.value)}
                    sx={{
                      width: { xs: "100%", sm: 120 },
                      minWidth: { xs: "auto", sm: 120 },
                    }}
                  />
                  <FormControl
                    size="small"
                    sx={{
                      width: { xs: "100%", sm: 100 },
                      minWidth: { xs: "auto", sm: 100 },
                    }}
                  >
                    <Select
                      value={editCharGender}
                      onChange={(e) =>
                        setEditCharGender(e.target.value as Gender)
                      }
                    >
                      <MenuItem value="man">man</MenuItem>
                      <MenuItem value="woman">woman</MenuItem>
                      <MenuItem value="it">it</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button size="small" onClick={handleSaveChar}>
                      Save
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setEditingCharIndex(null)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: { xs: 0.5, sm: 1 },
                    width: "100%",
                  }}
                  onClick={() => handleEditChar(idx)}
                >
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChar(idx);
                    }}
                    sx={{
                      p: 0.5,
                      mr: 1,
                      "&:hover": { bgcolor: "error.light" },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Typography
                    sx={{
                      minWidth: { xs: "auto", sm: 120 },
                      flex: { xs: "none", sm: 1 },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    {char.original_name}
                  </Typography>
                  <Typography
                    sx={{
                      mx: { xs: 0, sm: 1 },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    =&gt;
                  </Typography>
                  <Typography
                    sx={{
                      minWidth: { xs: "auto", sm: 120 },
                      flex: { xs: "none", sm: 1 },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    {char.translated_name}
                  </Typography>
                  <Typography
                    sx={{
                      mx: { xs: 0, sm: 1 },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    ({char.gender})
                  </Typography>
                </Box>
              )}
            </Box>
          ))}

          {/* Add Character TextField */}
          <TextField
            label="Add Character (Format: Original:Translated:Gender)"
            variant="outlined"
            size="small"
            sx={{
              mt: 2,
              width: "100%",
              "& .MuiInputBase-input": {
                fontSize: { xs: "0.875rem", sm: "1rem" },
              },
            }}
            onKeyDown={handleAddCharacter}
          />
        </Box>

        {/* Footer */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            p: { xs: 2, sm: 3 },
            borderTop: 1,
            borderColor: "divider",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
              px: { xs: 2, sm: 3 },
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default GlossaryModal;
