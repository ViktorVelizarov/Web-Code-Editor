import React from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { LANGUAGE_VERSIONS } from "../constants";

const languages = Object.entries(LANGUAGE_VERSIONS);
const ACTIVE_COLOR = "#42a5f5"; // Material UI blue[400] equivalent

const LanguageSelector = ({ language, onSelect }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box ml={2} mb={4} color= "white">
      <Typography variant="h6" gutterBottom>
        Language:
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpen}
      >
        {language}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {languages.map(([lang, version]) => (
          <MenuItem
            key={lang}
            selected={lang === language}
            onClick={() => {
              onSelect(lang);
              handleClose();
            }}
            style={{
              color: lang === language ? ACTIVE_COLOR : "inherit",
              backgroundColor: lang === language ? "#424242" : "transparent",
            }}
          >
            {lang}
            &nbsp;
            <Typography component="span" color="textSecondary" variant="body2">
              ({version})
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;
