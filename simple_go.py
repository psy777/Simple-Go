import pygame
import sys
import tkinter as tk
from tkinter import simpledialog

def ask_board_size():
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    board_size = simpledialog.askinteger("Input", "What size board do you want? (e.g., 9, 13, 19)", minvalue=9, maxvalue=19)
    root.destroy()
    if board_size is None:
        print("No board size selected. Exiting.")
        sys.exit()
    return board_size
    
def load_background(board_size):
    image_path = f'{board_size}_by_{board_size}_board.png'
    return pygame.transform.scale(pygame.image.load(image_path), (SQUARE_SIZE * board_size, SQUARE_SIZE * board_size))
    
# Define some constants
BOARD_SIZE = ask_board_size()
SQUARE_SIZE = 56  # size of each square on the board
BORDER_SIZE = SQUARE_SIZE // 2  # size of the border around the board
BOARD_PIXELS = BOARD_SIZE * SQUARE_SIZE
STONE_RADIUS = SQUARE_SIZE // 2- 2  # radius of each stone, slightly less than half a square

# Load images
BLACK_STONE = pygame.transform.scale(pygame.image.load('white_stone.png'), (SQUARE_SIZE, SQUARE_SIZE))
WHITE_STONE = pygame.transform.scale(pygame.image.load('black_stone.png'), (SQUARE_SIZE, SQUARE_SIZE))
BLACK_STONE_PREVIEW = BLACK_STONE.copy()
BLACK_STONE_PREVIEW.set_alpha(128)  # 128 out of 255, so about 50% transparency
WHITE_STONE_PREVIEW = WHITE_STONE.copy()
WHITE_STONE_PREVIEW.set_alpha(128)  # 128 out of 255, so about 50% transparency
BACKGROUND = load_background(BOARD_SIZE)

class GoBoard:
    def __init__(self):
        self.board = [[' ' for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.players = ['B', 'W']  # B = Black, W = White
        self.current_player = 0
        self.groups = []


    def create_group(self, x,y):
        #Create a set of stones containing only the new stone
        stones = {(x, y)}

        #Create a set of liberties for the new stone
        liberties = set()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 < nx < BOARD_SIZE and 0 <= ny < BOARD_SIZE and self.board[nx][ny] == ' ':
                liberties.add((nx, ny))

        #Create a new group and add it to the list of groups 
        group = Group(self.players[self.current_player], stones, liberties)
        self.groups.append(group)
        
    def update_groups(self):
        visited = [[False for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.groups = []

        def dfs(x, y, color):
            if x < 0 or x >= BOARD_SIZE or y < 0 or y >= BOARD_SIZE:
                return set(), set()
            if visited[x][y] or self.board[x][y] != color:
                return set(), set()

            visited[x][y] = True
            stones = {(x, y)}
            liberties = set()

            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < BOARD_SIZE and 0 <= ny < BOARD_SIZE:
                    if self.board[nx][ny] == ' ':
                        liberties.add((nx, ny))
                    elif self.board[nx][ny] == color:
                        s, l = dfs(nx, ny, color)
                        stones |= s
                        liberties |= l

            return stones, liberties

        for x in range(BOARD_SIZE):
            for y in range(BOARD_SIZE):
                if not visited[x][y] and self.board[x][y] != ' ':
                    stones, liberties = dfs(x, y, self.board[x][y])
                    if stones:
                        self.groups.append(Group(self.board[x][y], stones, liberties))

    def make_move(self, x, y):
        if self.board[x][y] != ' ':
            print("Invalid move, the spot is already occupied.")
            return False

        # Temporarily place the stone
        self.board[x][y] = self.players[self.current_player]

        # Check for suicide move
        self.update_groups()
        suicide = False
        for group in self.groups:
            if group.player == self.players[self.current_player] and len(group.liberties) == 0:
                suicide = True
                break

        # Check for captures
        captures = [group for group in self.groups if group.player != self.players[self.current_player] and len(group.liberties) == 0]

        # If it's a suicide move and no captures, it's illegal
        if suicide and not captures:
            self.board[x][y] = ' '  # Remove the temporarily placed stone
            print("Illegal move, suicide.")
            return False

        # TODO: Implement Ko rule check here

        # If the move is legal, finalize the stone placement and update groups
        print(f"Player {self.players[self.current_player]} placed a stone at ({x+1}, {y+1})")
        for group in captures:
            for stone_x, stone_y in group.stones:
                self.board[stone_x][stone_y] = ' '
            self.groups.remove(group)
        self.current_player = (self.current_player + 1) % 2  # switch player
        return True

    
    
    def print_groups(self):
        for i, group in enumerate(self.groups, start=1):
            print(f"Group {i} (Player{group.player}):")
            print(f" Stones:", sorted(group.stones))
            print(f" Liberties:", sorted(group.liberties))

    def draw(self, screen):
        #Draw the background
        screen.blit(BACKGROUND, (BORDER_SIZE, BORDER_SIZE))

        # Draw the stones
        for x in range(BOARD_SIZE):
            for y in range(BOARD_SIZE):
                if self.board[x][y] == 'B':
                    screen.blit(WHITE_STONE, (BORDER_SIZE + x*SQUARE_SIZE, BORDER_SIZE + y*SQUARE_SIZE))
                elif self.board[x][y] == 'W':
                    screen.blit(BLACK_STONE, (BORDER_SIZE + x*SQUARE_SIZE, BORDER_SIZE + y*SQUARE_SIZE))

class Group:
    def __init__(self, player, stones=set(), liberties=set()):
        self.stones = stones
        self.liberties = liberties
        self.player = player

    def update_liberties(self, board):
        self.liberties = set()  # Clear the current liberties
        for x, y in self.stones:
            # Check each adjacent position
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < len(board) and 0 <= ny < len(board[0]) and board[nx][ny] == ' ':
                    self.liberties.add((nx, ny))

def main():
    pygame.init()
    screen = pygame.display.set_mode((BOARD_PIXELS + 2*BORDER_SIZE, BOARD_PIXELS + 2*BORDER_SIZE))
    clock = pygame.time.Clock()

    board = GoBoard()

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            elif event.type == pygame.MOUSEBUTTONDOWN:
                x, y = event.pos
                board_x = (x - BORDER_SIZE) // SQUARE_SIZE
                board_y = (y - BORDER_SIZE) // SQUARE_SIZE
                if 0 <= board_x < BOARD_SIZE and 0 <= board_y < BOARD_SIZE:
                    board.make_move(board_x, board_y)
                    board.print_groups()

        board.draw(screen)

        # Draw preview stone
        x, y = pygame.mouse.get_pos()
        board_x = (x - BORDER_SIZE) // SQUARE_SIZE
        board_y = (y - BORDER_SIZE) // SQUARE_SIZE
        if 0 <= board_x < BOARD_SIZE and 0 <= board_y < BOARD_SIZE and board.board[board_x][board_y] == ' ':
            if board.current_player == 0:
                screen.blit(WHITE_STONE_PREVIEW, (BORDER_SIZE + board_x*SQUARE_SIZE, BORDER_SIZE + board_y*SQUARE_SIZE))
            else:
                screen.blit(BLACK_STONE_PREVIEW, (BORDER_SIZE + board_x*SQUARE_SIZE, BORDER_SIZE + board_y*SQUARE_SIZE))
        else:
            board.draw(screen)

        pygame.display.flip()
        clock.tick(60)

if __name__ == "__main__":
    main()
