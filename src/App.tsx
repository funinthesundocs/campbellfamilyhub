import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { HubProvider } from './contexts/HubContext';
import { ToastProvider } from './contexts/ToastContext';
import { TrainingProvider } from './contexts/TrainingContext';
import { PageLayout } from './components/layout/PageLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Media from './pages/Media';
import Music from './pages/Music';
import Recipes from './pages/Recipes';
import RecipeForm from './pages/RecipeForm';
import RecipeDetail from './pages/RecipeDetail';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Reservations from './pages/Reservations';
import ReservationDetail from './pages/ReservationDetail';
import Polls from './pages/Polls';
import PollForm from './pages/PollForm';
import PollDetail from './pages/PollDetail';
import Crowdfunding from './pages/Crowdfunding';
import CampaignForm from './pages/CampaignForm';
import CampaignDetail from './pages/CampaignDetail';
import JokesAndStories from './pages/Jokes';
import StoryForm from './pages/StoryForm';
import StoryDetail from './pages/StoryDetail';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Members from './pages/Members';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <HubProvider>
          <AuthProvider>
            <TrainingProvider>
              <ToastProvider>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<PageLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/media" element={<Media />} />
                    <Route path="/music" element={<Music />} />
                    <Route path="/recipes" element={<Recipes />} />
                    <Route path="/recipes/new" element={<RecipeForm />} />
                    <Route path="/recipes/:id" element={<RecipeDetail />} />
                    <Route path="/recipes/:id/edit" element={<RecipeForm />} />
                    <Route path="/properties" element={<Properties />} />
                    <Route path="/properties/:id" element={<PropertyDetail />} />
                    <Route path="/reservations" element={<Reservations />} />
                    <Route path="/reservations/:id" element={<ReservationDetail />} />
                    <Route path="/polls" element={<Polls />} />
                    <Route path="/polls/new" element={<PollForm />} />
                    <Route path="/polls/:id" element={<PollDetail />} />
                    <Route path="/crowdfunding" element={<Crowdfunding />} />
                    <Route path="/crowdfunding/new" element={<CampaignForm />} />
                    <Route path="/crowdfunding/:id" element={<CampaignDetail />} />
                    <Route path="/jokes" element={<JokesAndStories />} />
                    <Route path="/stories/new" element={<StoryForm />} />
                    <Route path="/stories/:id" element={<StoryDetail />} />
                    <Route path="/stories/:id/edit" element={<StoryForm />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/family-tree" element={<Members />} />
                    <Route path="/admin" element={<Admin />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
                </Routes>
              </ToastProvider>
            </TrainingProvider>
          </AuthProvider>
        </HubProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
