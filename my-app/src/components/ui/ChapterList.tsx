import React from "react";
import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useAppContext } from "../../contexts/AppContext";

const ChapterList: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { chapters, selectedChapter, settings } = state;

  const handleChapterSelect = (chapterId: number) => {
    dispatch({ type: "SET_SELECTED_CHAPTER", payload: chapterId });
  };

  if (chapters.length === 0) {
    return (
      <div className="chapter-list">
        <p>No chapters loaded</p>
      </div>
    );
  }

  return (
    <div className="chapter-list">
      <List className="chapter-ul">
        {chapters.map((chapter, index) => (
          <ListItem key={chapter.id} className="chapter-item">
            <ListItemButton
              className={`chapter-button ${
                selectedChapter === index ? "Mui-selected" : ""
              }`}
              onClick={() => handleChapterSelect(index)}
            >
              <ListItemText
                primary={chapter.title}
                primaryTypographyProps={{
                  style: { fontSize: settings.fontSize },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default ChapterList;
