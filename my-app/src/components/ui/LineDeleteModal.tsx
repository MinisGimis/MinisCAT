import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useAppContext } from "../../contexts/AppContext";

const LineDeleteModal: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { clickedLine, isLineModalOpen } = state.viewerState;

  const handleDelete = () => {
    if (clickedLine) {
      dispatch({ type: "DELETE_LINE_FROM_ALL_CHAPTERS", payload: clickedLine });
      dispatch({ type: "SET_LINE_MODAL_OPEN", payload: false });
      dispatch({ type: "SET_CLICKED_LINE", payload: null });
    }
  };

  const handleClose = () => {
    dispatch({ type: "SET_LINE_MODAL_OPEN", payload: false });
    dispatch({ type: "SET_CLICKED_LINE", payload: null });
  };

  return (
    <Dialog
      open={isLineModalOpen}
      onClose={handleClose}
      aria-labelledby="line-delete-modal-title"
      aria-describedby="line-delete-modal-description"
    >
      <DialogTitle id="line-delete-modal-title">Delete Line</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to delete this line from all chapters?
        </Typography>
        <Box
          sx={{
            p: 2,
            bgcolor: "#f5f5f5",
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "0.9em",
            maxWidth: "400px",
            wordBreak: "break-word",
          }}
        >
          {clickedLine}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleDelete} variant="contained" color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LineDeleteModal;
