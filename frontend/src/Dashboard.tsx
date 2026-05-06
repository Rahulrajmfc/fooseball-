import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const [game, setGame] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [newName, setNewName] = useState('');
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [playerNames, setPlayerNames] = useState({
    p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: ''
  });

  useEffect(() => {
    if (adminToken) {
      setIsAdmin(true);
    }
    fetchCurrentGame();
  }, [adminToken]);

  const fetchCurrentGame = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games/current`);
      setGame(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching game:', error);
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        username,
        password
      });
      localStorage.setItem('adminToken', response.data.token);
      setAdminToken(response.data.token);
      setIsAdmin(true);
      setUsername('');
      setPassword('');
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAdmin(false);
  };

  const handleAddScore = async (teamIndex, playerIndex) => {
    if (!isAdmin) {
      alert('Only admins can update scores');
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/games/${game._id}/score`,
        { teamIndex, playerIndex, increment: 1 },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      setGame(response.data);
    } catch (error) {
      alert('Error updating score: ' + error.response?.data?.error);
    }
  };

  const handleUpdatePlayerName = async (teamIndex, playerIndex) => {
    if (!newName.trim()) {
      alert('Please enter a valid name');
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/games/${game._id}/player-name`,
        { teamIndex, playerIndex, newName },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      setGame(response.data);
      setEditingPlayer(null);
      setNewName('');
    } catch (error) {
      alert('Error updating player name: ' + error.response?.data?.error);
    }
  };

  const handleUpdateTeamName = async (teamIndex) => {
    if (!newName.trim()) {
      alert('Please enter a valid team name');
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/games/${game._id}/team-name`,
        { teamIndex, newName },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      setGame(response.data);
      setEditingTeam(null);
      setNewName('');
    } catch (error) {
      alert('Error updating team name: ' + error.response?.data?.error);
    }
  };

  const handleResetPlayerScore = async (teamIndex, playerIndex) => {
    if (!window.confirm('Reset this player\'s score?')) return;

    try {
      const response = await axios.put(
        `${API_URL}/api/games/${game._id}/reset-player`,
        { teamIndex, playerIndex },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      setGame(response.data);
    } catch (error) {
      alert('Error resetting score: ' + error.response?.data?.error);
    }
  };

  const handleEndGame = async () => {
    if (!window.confirm('Are you sure you want to end this game?')) return;

    try {
      const response = await axios.put(
        `${API_URL}/api/games/${game._id}/end`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      setGame(response.data);
      alert('Game ended!');
    } catch (error) {
      alert('Error ending game: ' + error.response?.data?.error);
    }
  };

  const handleCreateNewGame = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/games`,
        { playerNames: showPlayerSetup ? playerNames : {} },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      setGame(response.data);
      setShowPlayerSetup(false);
      setPlayerNames({ p1: '', p2: '', p3: '', p4: '', p5: '', p6: '', p7: '', p8: '' });
    } catch (error) {
      alert('Error creating game: ' + error.response?.data?.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
            >
              Login
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-4">
            Demo Credentials: admin / admin123
          </p>
        </div>
      </div>
    );
  }

  // Player Setup Modal
  if (showPlayerSetup && !game) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Setup Player Names</h1>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <div key={num}>
                <label className="block text-sm font-semibold mb-2">
                  Player {num}
                </label>
                <input
                  type="text"
                  value={playerNames[`p${num}`]}
                  onChange={(e) =>
                    setPlayerNames({ ...playerNames, [`p${num}`]: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Player ${num}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleCreateNewGame}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
            >
              Start Game
            </button>
            <button
              onClick={() => {
                setShowPlayerSetup(false);
                handleCreateNewGame();
              }}
              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
            >
              Start with Default Names
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold">Foosball Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-xl mb-6">No active game</p>
            <button
              onClick={() => setShowPlayerSetup(true)}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg"
            >
              Create New Game with Custom Names
            </button>
            <button
              onClick={handleCreateNewGame}
              className="ml-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-lg"
            >
              Create New Game (Default Names)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">Foosball Live Score Dashboard</h1>
            <p className="text-lg text-gray-600 mt-2">Round: {game.round}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
          >
            Logout
          </button>
        </div>

        {/* Admin Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 space-y-3">
          <h2 className="text-xl font-bold">Admin Controls</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowPlayerSetup(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
            >
              New Game
            </button>
            <button
              onClick={handleEndGame}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
            >
              End Current Game
            </button>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {game.teams.map((team, teamIndex) => (
            <div key={teamIndex} className="bg-white rounded-lg shadow-lg p-6">
              {/* Team Name */}
              {editingTeam === teamIndex ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdateTeamName(teamIndex)}
                    className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setNewName('');
                    }}
                    className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{team.name}</h2>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingTeam(teamIndex);
                        setNewName(team.name);
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      ✎ Edit
                    </button>
                  )}
                </div>
              )}

              <p className="text-4xl font-bold text-blue-600 mb-2">
                Total: {team.totalScore}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Round Wins: {team.roundWins}
              </p>

              {/* Players */}
              <div className="space-y-3">
                {team.players.map((player, playerIndex) => (
                  <div
                    key={playerIndex}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex-1">
                      {editingPlayer?.team === teamIndex &&
                      editingPlayer?.player === playerIndex ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleUpdatePlayerName(teamIndex, playerIndex)
                            }
                            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingPlayer(null);
                              setNewName('');
                            }}
                            className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{player.name}</p>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingPlayer({
                                    team: teamIndex,
                                    player: playerIndex
                                  });
                                  setNewName(player.name);
                                }}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                          <p className="text-2xl font-bold">{player.score}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddScore(teamIndex, playerIndex)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                      >
                        + Goal
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() =>
                            handleResetPlayerScore(teamIndex, playerIndex)
                          }
                          className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold"
                          title="Reset score"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
