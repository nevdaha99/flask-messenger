from project import project


def main():
    try:
        project.run(debug=True)

    except Exception as err:
        print(err)


if __name__ == "__main__":
    main()
