from pathlib import Path


def load_tests(loader, tests, pattern):
    directory = str(Path(__file__).parent / "tests")
    return loader.discover(directory, top_level_dir=directory)
