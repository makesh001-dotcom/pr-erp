import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export default function Topbar() {
  const role = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      className="no-print"
      sx={{
        backgroundColor: "#ffffff",
        color: "#111827",
        borderBottom: "1px solid #e5e7eb",
        backdropFilter: "blur(8px)",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          minHeight: "70px",
          px: { xs: 2, md: 4 },
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* Left Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          
          {/* Brand */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: 0.5,
                color: "#111827",
                lineHeight: 1,
              }}
            >
              PR-SYSTEM
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "#6b7280",
                fontWeight: 500,
                letterSpacing: 0.3,
              }}
            >
              Management Dashboard
            </Typography>
          </Box>

          {/* Role Badge */}
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              px: 1.5,
              py: 0.5,
              borderRadius: "999px",
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#2563eb",
                letterSpacing: 0.5,
              }}
            >
              {role?.toUpperCase()} PANEL
            </Typography>
          </Box>
        </Box>

        {/* Right Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          
          {/* User Info */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.8,
              borderRadius: "12px",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
            }}
          >
            <AccountCircleIcon sx={{ color: "#6b7280" }} />

            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "#111827",
                  lineHeight: 1.1,
                }}
              >
                User
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: "#6b7280",
                }}
              >
                Active Session
              </Typography>
            </Box>
          </Box>

          {/* Logout Button */}
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              px: 2,
              py: 0.9,
              fontWeight: 600,
              boxShadow: "none",

              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}