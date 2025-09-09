import React, { useState } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState } from 'store';
import { toggleTheme } from 'store/themeSlice';
import { selectNetwork } from 'store/walletSlice';
import { logout } from 'store/authSlice';
import { AccountSwitcher } from 'components/AccountSwitcher';
import { SunIcon, MoonIcon, MenuIcon, CloseIcon } from 'components/Icons';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background: ${({ theme }) => theme.card};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const HeaderBottom = styled.div`
  margin-top: 12px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const LogoImage = styled.img<{ $darkMode: boolean }>`
  height: 28px;
  width: auto;
  object-fit: contain;
  filter: ${({ $darkMode }) => $darkMode ? 'invert(1)' : 'none'};
  transition: filter 0.3s ease;
  
  @media (min-width: 769px) {
    height: 36px;
  }
`;

const LogoText = styled.h1`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  margin: 0;
  display: none;
  
  @media (min-width: 480px) {
    display: block;
  }
  
  @media (min-width: 769px) {
    font-size: 24px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (min-width: 769px) {
    gap: 16px;
  }
`;

const NetworkSelector = styled.select`
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text.primary};
  font-size: 12px;
  max-width: 100px;
  
  @media (min-width: 480px) {
    max-width: none;
    padding: 8px 12px;
    font-size: 14px;
  }
`;

const IconButton = styled.button`
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;

  &:hover {
    background: ${({ theme }) => theme.primary};
    color: white;
  }
`;

const MenuButton = styled(IconButton)`
  @media (min-width: 1024px) {
    display: none;
  }
`;

// Desktop Nav
const DesktopNav = styled.nav`
  background: ${({ theme }) => theme.surface};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  padding: 0 24px;
  display: none;
  gap: 24px;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    height: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.surface};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.border};
    border-radius: 3px;
  }
  
  @media (min-width: 1024px) {
    display: flex;
  }
`;

// Mobile Nav Drawer
const MobileNavDrawer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${({ $isOpen }) => $isOpen ? '0' : '-100%'};
  width: 80%;
  max-width: 320px;
  height: 100vh;
  background: ${({ theme }) => theme.card};
  border-left: 1px solid ${({ theme }) => theme.border};
  transition: right 0.3s ease;
  z-index: 1000;
  overflow-y: auto;
  
  @media (min-width: 1024px) {
    display: none;
  }
`;

const MobileNavOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  z-index: 999;
  
  @media (min-width: 1024px) {
    display: none;
  }
`;

const MobileNavHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MobileNavContent = styled.div`
  padding: 16px;
`;

const MobileNavSection = styled.div`
  margin-bottom: 24px;
`;

const MobileNavSectionTitle = styled.h3`
  font-size: 12px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.text.tertiary};
  margin-bottom: 12px;
  font-weight: 600;
`;

const MobileNavLink = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: ${({ $active, theme }) => $active ? theme.primary + '20' : 'transparent'};
  border: none;
  border-left: 3px solid ${({ $active, theme }) => $active ? theme.primary : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.primary : theme.text.secondary};
  font-weight: ${({ $active }) => $active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 14px;
  margin-bottom: 4px;
  border-radius: 4px;

  &:hover {
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.primary};
  }
`;

const NavLink = styled.button<{ $active: boolean }>`
  padding: 16px 0;
  background: none;
  border: none;
  border-bottom: 3px solid ${({ $active, theme }) => ($active ? theme.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.primary : theme.text.secondary)};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-size: 14px;

  &:hover {
    color: ${({ theme }) => theme.primary};
  }
`;

const LogoutButton = styled(MobileNavLink)`
  background: ${({ theme }) => theme.danger};
  color: white;
  border-left-color: ${({ theme }) => theme.danger};
  
  &:hover {
    background: ${({ theme }) => theme.danger};
    opacity: 0.8;
  }
`;

const Main = styled.main<{ $fullWidth?: boolean }>`
  flex: 1;
  padding: ${({ $fullWidth }) => $fullWidth ? '0' : '16px'};
  max-width: ${({ $fullWidth }) => $fullWidth ? 'none' : '1200px'};
  margin: 0 auto;
  width: 100%;
  
  @media (min-width: 769px) {
    padding: ${({ $fullWidth }) => $fullWidth ? '0' : '24px'};
  }
`;

interface LayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useSelector((state: RootState) => state.theme);
  const { networks, selectedNetwork, accounts } = useSelector((state: RootState) => state.wallet);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNetworkChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(selectNetwork(event.target.value));
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/accounts', label: 'Accounts' },
    { path: '/send', label: 'Send' },
    { path: '/receive', label: 'Receive' },
    { path: '/history', label: 'History' },
    { path: '/deploy', label: 'Deploy' },
    { path: '/ide', label: 'IDE' },
    { path: '/keys', label: 'Generate Keys' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <Container>
      <Header>
        <HeaderTop>
          <LeftSection>
            <LogoContainer onClick={() => navigate('/')}>
              <LogoImage 
                src="/asi-icon.png" 
                alt="ASI Alliance"
                $darkMode={darkMode}
              />
              <LogoText>ASI Wallet</LogoText>
            </LogoContainer>
          </LeftSection>
          
          <HeaderActions>
            <NetworkSelector 
              value={selectedNetwork.id} 
              onChange={handleNetworkChange}
            >
              {networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </NetworkSelector>
            
            <IconButton onClick={handleThemeToggle} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {darkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </IconButton>
            
            <MenuButton onClick={() => setMobileMenuOpen(true)}>
              <MenuIcon size={20} />
            </MenuButton>
          </HeaderActions>
        </HeaderTop>
        
        {isAuthenticated && accounts.length > 0 && (
          <HeaderBottom>
            <AccountSwitcher />
          </HeaderBottom>
        )}
      </Header>

      {/* Desktop Navigation */}
      <DesktopNav>
        {navItems.map(item => (
          <NavLink 
            key={item.path}
            $active={location.pathname === item.path} 
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </NavLink>
        ))}
      </DesktopNav>

      {/* Mobile Navigation Drawer */}
      <MobileNavOverlay $isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(false)} />
      <MobileNavDrawer $isOpen={mobileMenuOpen}>
        <MobileNavHeader>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Menu</h2>
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <CloseIcon size={20} />
          </IconButton>
        </MobileNavHeader>
        
        <MobileNavContent>
          <MobileNavSection>
            <MobileNavSectionTitle>Navigation</MobileNavSectionTitle>
            {navItems.map(item => (
              <MobileNavLink
                key={item.path}
                $active={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                {item.label}
              </MobileNavLink>
            ))}
          </MobileNavSection>
          
          {isAuthenticated && (
            <MobileNavSection>
              <MobileNavSectionTitle>Account</MobileNavSectionTitle>
              <LogoutButton $active={false} onClick={handleLogout}>
                Logout
              </LogoutButton>
            </MobileNavSection>
          )}
        </MobileNavContent>
      </MobileNavDrawer>

      <Main $fullWidth={location.pathname === '/ide'}>{children}</Main>
    </Container>
  );
};