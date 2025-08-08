import React from 'react';
import { List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useAppContext } from '../contexts/AppContext';

const ChapterList = () => {
    const { state, dispatch } = useAppContext();
    const { originalChapterContents, selectedChapter, settings } = state;

    const handleChapterSelect = (chapterId: number) => {
        dispatch({ type: 'SET_SELECTED_CHAPTER', payload: chapterId });
    };

    if (originalChapterContents.length === 0) {
        return (
            <div className="chapter-list">
                <p>No chapters loaded</p>
            </div>
        );
    }

    const renderChapterItems = () => {
        const items = [];
        for (let index = 0; index < originalChapterContents.length; index++) {
            const chapter = originalChapterContents[index];
            let buttonClassName = 'chapter-button';
            if (selectedChapter === index) {
                buttonClassName += ' Mui-selected';
            }

            items.push(
                <ListItem key={index} className="chapter-item">
                    <ListItemButton
                        className={buttonClassName}
                        onClick={() => handleChapterSelect(index)}
                    >
                        <ListItemText
                            primary={
                                <Typography style={{ fontSize: settings.fontSize }}>
                                    {chapter[0]}
                                </Typography>
                            }
                        />
                    </ListItemButton>
                </ListItem>
            );
        }
        return items;
    };

    return (
        <div className="chapter-list">
            <List className="chapter-ul">
                {renderChapterItems()}
            </List>
        </div>
    );
};

export default ChapterList; 