import React from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState } from 'store';
import { toggleTheme } from 'store/themeSlice';
import { selectNetwork } from 'store/walletSlice';
import { SunIcon, MoonIcon } from 'components/Icons';
import { logout } from 'store/authSlice';
import { AccountSwitcher } from 'components/AccountSwitcher';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background: ${({ theme }) => theme.card};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  min-width: 0;
  
  @media (max-width: 768px) {
    gap: 16px;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
`;

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const LogoImage = styled.img<{ $darkMode: boolean }>`
  height: 36px;
  width: auto;
  object-fit: contain;
  filter: ${({ $darkMode }) => $darkMode ? 'invert(1)' : 'none'};
  transition: filter 0.3s ease;
`;

const LogoText = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const NetworkSelector = styled.select`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text.primary};
  font-size: 14px;
`;

const ThemeToggle = styled.button`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text.primary};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.primary};
    color: white;
  }
`;

const Main = styled.main<{ fullWidth?: boolean }>`
  flex: 1;
  padding: ${({ fullWidth }) => fullWidth ? '0' : '24px'};
  max-width: ${({ fullWidth }) => fullWidth ? 'none' : '1200px'};
  margin: 0 auto;
  width: 100%;
`;

const Nav = styled.nav`
  background: ${({ theme }) => theme.surface};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  padding: 0 24px;
  display: flex;
  gap: 24px;
`;

const NavLink = styled.button<{ active: boolean }>`
  padding: 16px 0;
  background: none;
  border: none;
  border-bottom: 3px solid ${({ active, theme }) => (active ? theme.primary : 'transparent')};
  color: ${({ active, theme }) => (active ? theme.primary : theme.text.secondary)};
  font-weight: ${({ active }) => (active ? '600' : '400')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primary};
  }
`;

const LogoutButton = styled(ThemeToggle)`
  background: ${({ theme }) => theme.danger};
  color: white;
  
  &:hover {
    background: ${({ theme }) => theme.danger};
    opacity: 0.8;
  }
`;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useSelector((state: RootState) => state.theme);
  const { networks, selectedNetwork, accounts } = useSelector((state: RootState) => state.wallet);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  

  const handleNetworkChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(selectNetwork(event.target.value));
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Container>
      <Header>
        <LeftSection>
          <LogoContainer onClick={() => navigate('/')}>
            <LogoWrapper>
              <LogoImage 
                src="/asi-icon.png" 
                alt="ASI Alliance"
                $darkMode={darkMode}
              />
            </LogoWrapper>
            <LogoText>ASI Wallet v2</LogoText>
          </LogoContainer>
          {isAuthenticated && accounts.length > 0 && (
            <AccountSwitcher />
          )}
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
          <ThemeToggle onClick={handleThemeToggle} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {darkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </ThemeToggle>
          {isAuthenticated && (
            <LogoutButton onClick={handleLogout}>
              Logout
            </LogoutButton>
          )}
        </HeaderActions>
      </Header>
      <Nav>
        <NavLink 
          active={location.pathname === '/'} 
          onClick={() => navigate('/')}
        >
          Dashboard
        </NavLink>
        <NavLink 
          active={location.pathname === '/accounts'} 
          onClick={() => navigate('/accounts')}
        >
          Accounts
        </NavLink>
        <NavLink 
          active={location.pathname === '/send'} 
          onClick={() => navigate('/send')}
        >
          Send
        </NavLink>
        <NavLink 
          active={location.pathname === '/receive'} 
          onClick={() => navigate('/receive')}
        >
          Receive
        </NavLink>
        <NavLink 
          active={location.pathname === '/history'} 
          onClick={() => navigate('/history')}
        >
          History
        </NavLink>
        <NavLink 
          active={location.pathname === '/deploy'} 
          onClick={() => navigate('/deploy')}
        >
          Deploy
        </NavLink>
        <NavLink 
          active={location.pathname === '/ide'} 
          onClick={() => navigate('/ide')}
        >
          IDE
        </NavLink>
        <NavLink 
          active={location.pathname === '/keys'} 
          onClick={() => navigate('/keys')}
        >
          Generate Keys
        </NavLink>
        <NavLink 
          active={location.pathname === '/settings'} 
          onClick={() => navigate('/settings')}
        >
          Settings
        </NavLink>
      </Nav>
      <Main fullWidth={location.pathname === '/ide'}>{children}</Main>
    </Container>
  );
};