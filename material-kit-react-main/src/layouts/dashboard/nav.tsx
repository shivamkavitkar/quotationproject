import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import { useTheme } from '@mui/material/styles';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Drawer, { drawerClasses } from '@mui/material/Drawer';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';
import { Scrollbar } from 'src/components/scrollbar';

import type { NavItem } from '../nav-config-dashboard';
import type { WorkspacesPopoverProps } from '../components/workspaces-popover';

// ----------------------------------------------------------------------

export type NavContentProps = {
  data: NavItem[];
  isCollapsed?: boolean;
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
  workspaces: WorkspacesPopoverProps['data'];
  sx?: SxProps<Theme>;
};

// CHANGED: Added onMouseEnter and onMouseLeave to props
export function NavDesktop({
  sx,
  data,
  slots,
  workspaces,
  layoutQuery,
  isCollapsed,
  onMouseEnter,
  onMouseLeave,
}: NavContentProps & {
  layoutQuery: Breakpoint;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const theme = useTheme();

  return (
    // CHANGED: Added event handlers to the Box
    <Box
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        pt: 2.5,
        px: 2.5,
        top: 0,
        left: 0,
        height: 1,
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)',
        width: 'var(--layout-nav-vertical-width)',
        borderRight: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
        transition: theme.transitions.create(['width'], {
          duration: 'var(--layout-transition-duration)',
          easing: 'var(--layout-transition-easing)',
        }),
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
        },
        ...sx,
      }}
    >
      <NavContent data={data} slots={slots} workspaces={workspaces} isCollapsed={isCollapsed} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  open,
  slots,
  onClose,
  workspaces,
}: NavContentProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          pt: 2.5,
          px: 2.5,
          overflow: 'unset',
          width: 'var(--layout-nav-mobile-width)',
          ...sx,
        },
      }}
    >
      <NavContent data={data} slots={slots} workspaces={workspaces} />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function NavContent({ data, slots, workspaces, sx, isCollapsed }: NavContentProps) {
  const pathname = usePathname();

  return (
    <>
      {!isCollapsed && <Logo sx={{ mb: 8 }} />}

      {slots?.topArea}

      {/* <WorkspacesPopover data={workspaces} sx={{ my: 2 }} /> */}

      <Scrollbar fillContent>
        <Box
          component="nav"
          sx={[
            {
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <Box
            component="ul"
            sx={{
              gap: 0.5,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {data.map((item) => {
              const isActived = item.path === pathname;

              return (
                <ListItem disableGutters disablePadding key={item.title}>
                  <ListItemButton
                    disableGutters
                    component={RouterLink}
                    href={item.path}
                    sx={[
                      (theme) => ({
                        py: 1,
                        borderRadius: 0.75,
                        typography: 'body2',
                        color: theme.vars.palette.text.secondary,
                        fontWeight: 'fontWeightMedium',
                        minHeight: 44,
                        transition: theme.transitions.create(['color', 'backgroundColor', 'padding']),
                        ...(isCollapsed && {
                          justifyContent: 'center',
                        }),
                        ...(!isCollapsed && {
                          pl: 2,
                          pr: 1.5,
                          gap: 2,
                        }),
                        ...(isActived && {
                          fontWeight: 'fontWeightSemiBold',
                          color: theme.vars.palette.primary.main,
                          bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                          '&:hover': {
                            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                          },
                        }),
                      }),
                    ]}
                  >
                    <Box component="span" sx={{ width: 24, height: 24, flexShrink: 0 }}>
                      {item.icon}
                    </Box>

                    {!isCollapsed && (
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{
                          noWrap: true,
                          sx: {
                            width: 1,
                            flexGrow: 1,
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                            lineHeight: 'inherit',
                          },
                        }}
                      />
                    )}

                    {!isCollapsed && item.info && item.info}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </Box>
        </Box>
      </Scrollbar>

      {slots?.bottomArea}
    </>
  );
}