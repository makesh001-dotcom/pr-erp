import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
} from "@mui/material";

const drawerWidth = 240;

export default function Sidebar() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,

        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#111827",
          color: "#f9fafb",
          borderRight: "1px solid #1f2937",
        },
      }}
    >
      {/* Top Space */}
      <Toolbar
        sx={{
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.5,
            color: "#ffffff",
          }}
        >
          Admin Panel
        </Typography>
      </Toolbar>

      <Divider sx={{ borderColor: "#1f2937" }} />

      {/* Navigation */}
      <Box sx={{ px: 2, py: 3 }}>
        <List sx={{ display: "flex", flexDirection: "column", gap: 1 }}>

          <ListItemButton
            sx={{
              borderRadius: "12px",
              px: 2,
              py: 1.2,
              transition: "all 0.2s ease",

              "&:hover": {
                backgroundColor: "#1f2937",
              },
            }}
          >
            <ListItemText
              primary="Dashboard"
              primaryTypographyProps={{
                fontSize: 15,
                fontWeight: 600,
              }}
            />
          </ListItemButton>

          <ListItemButton
            sx={{
              borderRadius: "12px",
              px: 2,
              py: 1.2,

              "&:hover": {
                backgroundColor: "#1f2937",
              },
            }}
          >
            <ListItemText
              primary="Clients"
              primaryTypographyProps={{
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          </ListItemButton>

          <ListItemButton
            sx={{
              borderRadius: "12px",
              px: 2,
              py: 1.2,

              "&:hover": {
                backgroundColor: "#1f2937",
              },
            }}
          >
            <ListItemText
              primary="Parcel Print"
              primaryTypographyProps={{
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          </ListItemButton>

        </List>
      </Box>
    </Drawer>
  );
}