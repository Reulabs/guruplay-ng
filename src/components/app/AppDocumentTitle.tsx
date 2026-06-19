import { useLocation } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/use-document-title';

const routeTitles: Record<string, string> = {
  '/': 'Home',
  '/search': 'Search',
  '/library': 'Library',
  '/dashboard': 'Dashboard',
};

const AppDocumentTitle = () => {
  const { pathname } = useLocation();
  const title = pathname.startsWith('/playlist/') ? 'Playlist' : routeTitles[pathname];

  useDocumentTitle(title);
  return null;
};

export default AppDocumentTitle;
